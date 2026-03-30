import { ExtensionContext, window } from "vscode";
import { supabase } from "../../lib/supabase";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./auth.variables";

class AuthManager {
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

export default AuthManager;