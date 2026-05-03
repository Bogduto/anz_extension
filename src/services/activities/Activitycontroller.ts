import isInRepository from "../../utils/isInRepository";
import { timeNow } from "../../utils/time";
import { TimerService } from "../timer";
import { getActiveFile, openNewSession, closeActiveSession, setActiveFile } from "./ActivityManager";
import * as vscode from 'vscode';

function activitiesRegistrationController(timer: TimerService) {

    vscode.workspace.onDidChangeTextDocument((event) => {
        if (!timer.isRunningState) return;

        const filePath = event.document.uri.fsPath;
        const activeFile = getActiveFile();

        // Only care about edits to the currently tracked file
        if (filePath !== activeFile) return;
        if (!isInRepository(filePath)) return;

        const now = timeNow();

        openNewSession(filePath, event.document.languageId, now);
    });


    vscode.window.onDidChangeActiveTextEditor((editor) => {
        const now = timeNow();
        const prevFile = getActiveFile();

        if (!editor) {
            // Editor closed — close the active file's interval and stop tracking
            closeActiveSession(prevFile, now);
            setActiveFile(null);
            return;
        }

        const filePath = editor.document.uri.fsPath;

        if (!isInRepository(filePath)) {
            // Switched to a file outside the repo — close previous and stop tracking
            closeActiveSession(prevFile, now);
            setActiveFile(null);
            return;
        }

        // Close the previous file's interval, then open a new one for the incoming file
        closeActiveSession(prevFile, now);

        openNewSession(filePath, editor.document.languageId, now);

        setActiveFile(filePath);
    });

}

export default activitiesRegistrationController;