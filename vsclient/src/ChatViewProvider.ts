import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { ChatRequest } from 'tabby-agent';
import { agent } from "./agent";
import { marked } from "marked";

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "nava-assist-view";
  
    private _view?: vscode.WebviewView;
  
    private _sessionID: string = Date.now().toString();

    constructor(private readonly _extensionUri: vscode.Uri) {}
  

    public startNewChatSession() {
      if (this._view) {
          this._view.webview.postMessage({
              type: "startNewSession",
          });
          this._sessionID = Date.now().toString();
      }
  }

  private saveChatSession(sessionID: string, newMessages: {sender: string, text: string}[]) {
    const storagePath = this.getStoragePath();
    const sessions = this.loadChatSessions();

    // Check if session already exists
    if (sessions[sessionID]) {
      // Append new messages to existing session
      sessions[sessionID] = [...(sessions[sessionID] ?? []), ...newMessages];
    } else {
      // Create new session with new messages
      sessions[sessionID] = newMessages;
    }

    // Save to file
    fs.writeFileSync(storagePath, JSON.stringify(sessions));
}

private loadChatSessions(): { [id: string]: any[] } {
  const storagePath = this.getStoragePath();
  if (fs.existsSync(storagePath)) {
      return JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  }
  return {};
}

private getStoragePath(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const storageDir = workspaceFolders && workspaceFolders[0]?.uri.fsPath;
  if (storageDir) {
    const chatSessionsDir = path.join(storageDir, '.chatSessions');
    if (!fs.existsSync(chatSessionsDir)) {
      fs.mkdirSync(chatSessionsDir);
    }
    return path.join(chatSessionsDir, 'sessions.json');
  }
  throw new Error('No workspace folders found.');
}

public async retrieveAndDisplayPreviousSessions() {
  try {
      const sessions = this.loadChatSessions();
      // Convert sessions to QuickPick items
      const items: vscode.QuickPickItem[] = Object.keys(sessions).map(sessionID => {
        const firstUserMessage = sessions[sessionID]?.find(m => m.sender === 'user')?.text || 'No messages';
        return { label: firstUserMessage, description: sessionID};
      });

      // Show QuickPick
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Choose a chat session' });
      if (selected) {
        // Retrieve and display the selected session
        if (selected.description) {
          this._sessionID = selected.description;
          const sessionMessages = sessions[selected.description];
          if (this._view) {
            this._view.webview.postMessage({
              type: "displayPreviousSessions",
              sessions: { messages: sessionMessages}
            });
          }
        }
      }
  } catch (error) {
      console.error('Error retrieving previous sessions:', error);
      vscode.window.showErrorMessage("Failed to retrieve previous chat sessions.");
  }
}

    public resolveWebviewView(
      webviewView: vscode.WebviewView,
    ) {
      this._view = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "assets")],
      };
  
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      webviewView.webview.onDidReceiveMessage( async (data) => {
        switch (data.type) {
          case "prompt": {
            const activeEditor = vscode.window.activeTextEditor;
            const document = activeEditor?.document;
            const selection = activeEditor?.selection;
            const request: ChatRequest = {
              chat_session_id: this._sessionID,
              language: document?.languageId || '',
              filePath: document?.fileName || '',
              entireContent: document?.getText() || '',
              selectedContent: document?.getText(selection) || '',
              query: data.value,
            };
            const result = await agent().chatCompletion(request)
            const parsed_result = marked.parse(result.response)
            this.saveChatSession(this._sessionID, [
              {sender: "user", text: data.value},
              {sender: "ai", text: parsed_result},
          ]);
            webviewView.webview.postMessage({
              type: "displayMessage",
              text: parsed_result
            });
            break;
          }
        }
      });
    }
  
    private _getHtmlForWebview(webview: vscode.Webview) {
      const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "assets", "scripts", "main.js")
      );
      const userLogo = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "assets", "user-logo.png")
      );
      const aiLogo = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "assets", "nava-logo.png")
      );
      const cssStyles = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "assets", "styles.css")
      );
      const codeStyles = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "assets", "code.css")
      );
      console.log(userLogo)
      return `
      <!DOCTYPE html>
      <html lang="en">
      
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chat</title>
        <style>
          .user-logo {
            margin-bottom: 5px;
            background-image: url(${userLogo});
          }
                       
          .ai-logo {
            background-image: url(${aiLogo});
          }
        </style>
        <link rel="stylesheet" href=${cssStyles}>
        <link rel="stylesheet" href=${codeStyles}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      </head>
      
      <body>
        <div id="chat-container">
          <div id="response"></div>
          <div id="loading-container">
            <div class="loader"></div>
            <h4>Thinking...</h4>
          </div>
          <div id="prompt-container">
            <div id="input-wrapper" class="custom-search">
              <input id="prompt-input" class="custom-search-input" type="text"  placeholder="Enter your prompt here!">
              <button id="send-button" class="btn btn-primary custom-search-botton"><i class="fa fa-send-o"
                  style="font-size:24px"></i></button>
            </div>
          </div>
        </div>
        <script src="${scriptUri}"></script>
      </body>
      
      </html>
      `;
    }
  }
  