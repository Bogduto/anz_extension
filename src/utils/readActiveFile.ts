import path from "path";
import { window, workspace } from "vscode";

interface File {
    file: string;
    lang: string;
}

function readActiveFile(): File | void {
    const editor = window.activeTextEditor;
    if (!editor) return;

    const doc = editor.document;
    const relative = workspace.asRelativePath(doc.uri.fsPath);
    const file = relative.split(path.sep).slice(-2).join(path.sep);

    return { file, lang: doc.languageId };
}

export default readActiveFile;