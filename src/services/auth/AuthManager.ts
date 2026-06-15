import { EventEmitter, ExtensionContext } from "vscode";
import { supabase } from "../../lib/supabase";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./auth.variables";

class AuthManager {
    private _onDidChangeAuth = new EventEmitter<boolean>();
    public readonly onDidChangeAuth = this._onDidChangeAuth.event;

    private _isLoggedIn: boolean = false;

    constructor(private ctx: ExtensionContext) { }

    public async restoreSession(): Promise<boolean> {
        const accessToken = this.ctx.globalState.get<string>(ACCESS_TOKEN_KEY);
        const refreshToken = this.ctx.globalState.get<string>(REFRESH_TOKEN_KEY);
        console.log(`[RESTORE SESSION] Tokens found: ${!!accessToken && !!refreshToken}`);

        if (!accessToken || !refreshToken) {
            this._isLoggedIn = false;
            this._onDidChangeAuth.fire(false);
            return false;
        }

        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        console.log('[REFRESH]', refreshError ? `error: ${refreshError.message}` : 'success');

        // Save the new tokens so the old refresh token isn't reused next time
        if (refreshData?.session) {
            await this.ctx.globalState.update(ACCESS_TOKEN_KEY, refreshData.session.access_token);
            await this.ctx.globalState.update(REFRESH_TOKEN_KEY, refreshData.session.refresh_token);
        }

        const { data: { user }, error } = await supabase.auth.getUser();

        const isValid = !error && !!user;
        console.log(`[RESTORE SESSION] Valid: ${isValid}${error ? `, error: ${error.message}` : ''}`);

        this._isLoggedIn = isValid;
        this._onDidChangeAuth.fire(isValid);
        return isValid;
    }

    public async setSession(accessToken: string, refreshToken: string): Promise<void> {
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        const { error } = await supabase.auth.getUser();
        if (error) throw new Error("Failed to get user");

        await this.ctx.globalState.update(ACCESS_TOKEN_KEY, accessToken);
        await this.ctx.globalState.update(REFRESH_TOKEN_KEY, refreshToken);

        this._isLoggedIn = true; 
        this._onDidChangeAuth.fire(true);
    }

    public async clearSession(): Promise<void> {
        await this.ctx.globalState.update(ACCESS_TOKEN_KEY, null);
        await this.ctx.globalState.update(REFRESH_TOKEN_KEY, null);

        this._isLoggedIn = false; 
        this._onDidChangeAuth.fire(false);
    }

    public get isLoggedIn(): boolean {
        return this._isLoggedIn;
    }
}

export default AuthManager;