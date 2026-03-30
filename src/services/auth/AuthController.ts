import { ExtensionContext, window, commands, Uri } from "vscode";
import { AuthManager, AuthService } from "./";
import { LOGIN_COMMAND, LOGOUT_COMMAND } from "./auth.variables";


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
        // commands.registerCommand(CHECK_AUTH_COMMAND, () => {
        //     return authService.checkAuth();
        // })
    );

    window.registerUriHandler({
        handleUri: async (uri: Uri) => {
            try {
                const fragment = uri.fragment;
                const params = new URLSearchParams(fragment);

                const accessToken = params.get("access_token");
                const refreshToken = params.get("refresh_token");

                if (!accessToken || accessToken.split(".").length !== 3) {
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