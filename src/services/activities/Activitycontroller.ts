import isInRepository from "../../utils/isInRepository";
import { timeNow } from "../../utils/time";
import { TimerService } from "../timer";
import { getActiveFile, openNewSession, closeActiveSession, setActiveFile } from "./ActivityManager";
import * as vscode from 'vscode';

function activitiesRegistrationController(timer: TimerService) {
    // Handle the file that's already open when the extension starts
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor) {
        const filePath = currentEditor.document.uri.fsPath;
        if (isInRepository(filePath)) {
            setActiveFile(filePath);
        }
    }

    // Responsible ONLY for keeping the session open while typing
    vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;

        if (!editor || editor.document !== event.document) return;
        if (event.contentChanges.length === 0) return;
        if (!timer.isRunningState) return;

        const filePath = event.document.uri.fsPath;

        if (!isInRepository(filePath)) return;

        openNewSession(filePath, event.document.languageId, timeNow());
    });

    // Responsible ONLY for tracking which file is active
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        const now = timeNow();
        const prevFile = getActiveFile();

        if (!editor) {
            closeActiveSession(prevFile, now);
            setActiveFile(null);
            return;
        }

        const filePath = editor.document.uri.fsPath;

        if (!isInRepository(filePath)) {
            closeActiveSession(prevFile, now);
            setActiveFile(null);
            return;
        }

        closeActiveSession(prevFile, now);
        setActiveFile(filePath);
    });
}

export default activitiesRegistrationController;