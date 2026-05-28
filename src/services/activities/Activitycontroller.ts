import isInRepository from "../../utils/isInRepository";
import { timeNow } from "../../utils/time";
import { TimerService } from "../timer";
import ActivityManager from "./ActivityManager";
import AfkManager from "./AfkManager";
import * as vscode from 'vscode';

function activitiesRegistrationController(
    timer: TimerService,
    activityManager: ActivityManager,
    afkManager: AfkManager
) {
    // Handle the file that's already open when the extension starts
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor) {
        const filePath = currentEditor.document.uri.fsPath;
        if (isInRepository(filePath)) {
            activityManager.setActiveFile(filePath);
        }
    }

    vscode.window.onDidChangeTextEditorSelection(() => afkManager.resetIdleTimer("alt+tab"));

    // Responsible ONLY for keeping the session open while typing
    vscode.workspace.onDidChangeTextDocument((event) => {
        afkManager.resetIdleTimer("AFK");

        const editor = vscode.window.activeTextEditor;

        if (!editor || editor.document !== event.document) return;
        if (event.contentChanges.length === 0) return;
        if (!timer.isRunningState) return;

        const filePath = event.document.uri.fsPath;

        if (!isInRepository(filePath)) return;

        activityManager.openNewSession(filePath, event.document.languageId, timeNow());
    });

    // Responsible ONLY for tracking which file is active
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        afkManager.resetIdleTimer("AFK");
        const now = timeNow();
        const prevFile = activityManager.getActiveFile();

        if (!editor) {
            activityManager.closeActiveSession(prevFile, now);
            activityManager.setActiveFile(null);
            return;
        }

        const filePath = editor.document.uri.fsPath;

        if (!isInRepository(filePath)) {
            activityManager.closeActiveSession(prevFile, now);
            activityManager.setActiveFile(null);
            return;
        }

        activityManager.closeActiveSession(prevFile, now);
        activityManager.setActiveFile(filePath);

        if (!timer.isRunningState) return;

        activityManager.openNewSession(filePath, editor.document.languageId, now);
    });
}

export default activitiesRegistrationController;
