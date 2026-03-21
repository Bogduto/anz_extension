import { workspace } from "vscode";

export function getCurrentProject() {
    return workspace.workspaceFolders?.[0]?.uri.fsPath;
}
