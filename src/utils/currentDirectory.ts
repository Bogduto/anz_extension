import { workspace } from "vscode";

export function getCurrentProject(): string | undefined {
    return workspace.workspaceFolders?.[0]?.uri.fsPath;
}
