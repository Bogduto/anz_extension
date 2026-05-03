import { env, Uri, window } from "vscode";
import { SUPABASE_AUTH_PROVIDER, SUPABASE_URL } from "../../lib/supabase";

import { REDIRECT_URI } from "./auth.variables";
import { AuthManager } from ".";

class AuthService {
    constructor(private authSessionMenager: AuthManager) { }

    public login(): void {
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
}

export default AuthService;