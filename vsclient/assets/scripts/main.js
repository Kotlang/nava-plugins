// @ts-ignore 
// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
  let inputElement = document.getElementById('prompt-input');
  let buttonElement = document.getElementById('send-button');
  let responseElement = document.getElementById('response');
  let loadingContainer = document.getElementById('loading-container');
  let isWaitingForResponse = false;
  loadingContainer.style.display = "none";
  function toggleLoadingAnimation(show) {
    if (show) {
      loadingContainer.style.display = 'block';
    } else {
      loadingContainer.style.display = 'none';
    }
  }

  const vscode = acquireVsCodeApi();

  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
      case 'displayMessage':
        addMessage(message.text, 'ai');
        isWaitingForResponse = false;
        toggleLoadingAnimation(false);
        break;
      case 'startNewSession':
        responseElement.innerHTML = '';
        toggleLoadingAnimation(false);
        break;
      case 'displayPreviousSessions':
        displayPreviousSessions(message.sessions);
        toggleLoadingAnimation(false);
        break;
    }
  });


  function displayPreviousSessions(session) {
    responseElement.innerHTML = '';
    session.messages.forEach(msg => {
      addMessage(msg.text, msg.sender);
    });
  }

  function addMessage(text, sender) {
    let messageElement = document.createElement('div');
    let headerElement = document.createElement('div');
    let logoElement = document.createElement('div');
    let senderNameElement = document.createElement('div');
    let textElement = document.createElement('div');

    messageElement.classList.add('message');
    headerElement.classList.add('header');
    logoElement.classList.add('logo', `${sender}-logo`);
    senderNameElement.classList.add('sender-name');
    textElement.classList.add('text');

    senderNameElement.textContent = sender === 'ai' ? 'Nava-Assist-ai' : 'User';

    textElement.innerHTML = text;

    headerElement.appendChild(logoElement);
    headerElement.appendChild(senderNameElement);

    messageElement.appendChild(headerElement); 
    messageElement.appendChild(textElement); 

    responseElement.appendChild(messageElement);
    hljs.highlightAll();
  }

  function postMessage() {
    vscode.postMessage({
      type: 'prompt',
      value: inputElement.value,
    });
    addMessage(inputElement.value, 'user'); // User messages with 'user' class
    inputElement.value = '';
    isWaitingForResponse = true;
    toggleLoadingAnimation(true);
  }

  inputElement.addEventListener('keyup', function (e) {
    // If the key that was pressed was the Enter key
    if (e.key === "Enter") {
      postMessage();
    }
  });

  buttonElement.addEventListener('click', postMessage);

})();

