export const EXTENSION_ID = process.env.EXTENSION_ID || "bogduto.anz";
export const REDIRECT_URI = `vscode://${EXTENSION_ID}/auth/callback`;

export const ACCESS_TOKEN_KEY: string = "access_token";
export const REFRESH_TOKEN_KEY: string = "refresh_token";