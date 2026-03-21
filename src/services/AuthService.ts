import { commands, env, ExtensionContext, Uri, window } from "vscode";
import { supabase, SUPABASE_AUTH_PROVIDER, SUPABASE_URL } from "../lib/supabase";

export const LOGIN_COMMAND = "anz.LOGIN";
export const LOGOUT_COMMAND = "anz.LOGOUT";
export const CHECK_AUTH_COMMAND = "anz.CHECK_AUTH";

const EXTENSION_ID = "bogduto.anzio-extension";
const REDIRECT_URI = `vscode://${EXTENSION_ID}/auth/callback`;

export class AuthService {
    constructor(private authSessionMenager: AuthSessionMenager) { }

    public login(): void {
        // is logged in check

        const loginUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=${SUPABASE_AUTH_PROVIDER}&redirect_to=${encodeURIComponent(REDIRECT_URI)}`;
        env.openExternal(Uri.parse(loginUrl));
    }

    public logout(): void {
        this.authSessionMenager.clearSession();

        window.showInformationMessage("Logged out from Supabase");
    }

    public checkAuth(): boolean {
        return this.authSessionMenager.isLoggedIn;
    }

    public async getUserId(): Promise<string> {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!user || error) {
            throw new Error("User not logged in");
        }

        const userId = user.id;

        return userId;
    }
}

const ACCESS_TOKEN_KEY: string = "access_token";
const REFRESH_TOKEN_KEY: string = "refresh_token";

export class AuthSessionMenager {
    constructor(private ctx: ExtensionContext) { }

    public async restoreSession(): Promise<boolean> {
        const accessToken = this.ctx.globalState.get<string>(ACCESS_TOKEN_KEY);
        const refreshToken = this.ctx.globalState.get<string>(REFRESH_TOKEN_KEY);

        if (!accessToken || !refreshToken) return false;

        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
            window.showInformationMessage(`Welcome back!`);
            return true;
        }

        return false;
    }

    public async setSession(accessToken: string, refreshToken: string): Promise<void> {
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        const { error } = await supabase.auth.getUser();
        if (error) throw error;

        await this.ctx.globalState.update(ACCESS_TOKEN_KEY, accessToken);

        await this.ctx.globalState.update(REFRESH_TOKEN_KEY, refreshToken);
    }

    public async clearSession(): Promise<void> {
        await this.ctx.globalState.update(ACCESS_TOKEN_KEY, null);
        await this.ctx.globalState.update(REFRESH_TOKEN_KEY, null);
    }

    public get accessToken(): string | undefined {
        return this.ctx.globalState.get(ACCESS_TOKEN_KEY);
    }

    public get refreshToken(): string | undefined {
        return this.ctx.globalState.get(REFRESH_TOKEN_KEY);
    }

    public get isLoggedIn(): boolean {
        return !!this.accessToken;
    }
}

export async function authController(ctx: ExtensionContext, authSessionMenager: AuthSessionMenager, authService: AuthService): Promise<void> {
    // const authSessionMenager = new AuthSessionMenager(ctx);
    // const authService = new AuthService(authSessionMenager);

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