import { workspace } from "vscode";
import * as path from "path";
import * as fs from "fs";

function isInRepository(filePath: string): boolean {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) return false;

    let dir = path.dirname(filePath);
    const root = workspaceFolders[0].uri.fsPath;

    while (dir.startsWith(root)) {
        if (fs.existsSync(path.join(dir, ".git"))) return true;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return false;
}

export default isInRepository;