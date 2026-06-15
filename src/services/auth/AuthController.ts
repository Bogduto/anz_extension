import { ExtensionContext, window, commands, Uri } from "vscode";
import { AuthManager, AuthService } from "./";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./auth.variables";
import { LOGIN_COMMAND, LOGOUT_COMMAND } from "../../commands";


async function authController(ctx: ExtensionContext, authSessionMenager: AuthManager, authService: AuthService): Promise<void> {
    const restored = await authSessionMenager.restoreSession();
    
    if (!restored) {
        window.showInformationMessage("No active session, please login");
    }

    ctx.subscriptions.push(
        commands.registerCommand(LOGIN_COMMAND, () => {
            authService.login();
        }),
        commands.registerCommand(LOGOUT_COMMAND, () => {
            authService.logout();
        }),
    );

    window.registerUriHandler({
        handleUri: async (uri: Uri) => {
            try {
                const fragment = uri.fragment;
                const params = new URLSearchParams(fragment);

                const accessToken = params.get(ACCESS_TOKEN_KEY);
                const refreshToken = params.get(REFRESH_TOKEN_KEY);

                const isValidToken = accessToken && accessToken.split(".").length === 3;

                if (!isValidToken) {
                    throw new Error("No valid access token");
                }

                await authSessionMenager.setSession(accessToken, refreshToken || "");
                window.showInformationMessage("Login successful!");
            } catch (err: any) {
                window.showErrorMessage("Login failed: " + err.message);
            }
        }
    });
}

export default authController;