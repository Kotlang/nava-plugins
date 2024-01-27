import { EventEmitter } from "events";
import { window, ExtensionContext, Uri, env, workspace, ConfigurationTarget } from "vscode";
import { agent } from "./agent";

const redirecturi = process.env.REDIRECT_URI || 'vscode://TabbyML.vscode-tabby';
const providerUri = process.env.PROVIDER_URI || 'http://localhost:5173/signin';
const clientId = process.env.CLIENT_ID || '1234567890';

const configTarget = ConfigurationTarget.Global;

export class AuthenticationProvider extends EventEmitter {

    constructor() {
        super();
    }

    private handleUri(): Promise<{accessToken: string, apiendpoint: string}> {
        return new Promise((resolve, reject) => {
            const handler = window.registerUriHandler({
                handleUri(uri: Uri) {
                    const query = new URLSearchParams(uri.query);
                    let accessToken: string | null = null;
                    let apiendpoint: string | null = null;

                    query.forEach((value, key) => {
                        if (key === 'token') {
                            accessToken = value;
                        }
                        if (key === 'apiendpoint') {
                            apiendpoint = value;
                        }
                    });

                    if (accessToken && apiendpoint) {
                        resolve({accessToken, apiendpoint});
                    } else {
                        reject(new Error('Access token or redirect URI not present in the queries'));
                    }
                    handler.dispose();
                }
            });
        });
    }

    public async login(context: ExtensionContext) {
        await env.openExternal(Uri.parse(`${providerUri}?redirecturi=${redirecturi}&clientid=${clientId}`));
        try {
            const {accessToken, apiendpoint} = await this.handleUri();
            const configuration = workspace.getConfiguration("tabby");

            configuration.update("api.endpoint", apiendpoint, configTarget, false);
            context.globalState.update("server.token", accessToken);
            agent().updateConfig("server.token", accessToken);
            this.emit('login');
        } catch (error) {
            console.error('Login failed:', error);
        }
    }
} 