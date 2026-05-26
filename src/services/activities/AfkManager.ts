import { workspace } from "vscode";
import { timeNow } from "../../utils/time";
import { closeActiveSession, getActiveFile, openNewSession, setActiveFile } from "./ActivityManager";
import * as vscode from 'vscode';

let idleTimer: NodeJS.Timeout | undefined;
const IDLE_TIMEOUT = workspace.getConfiguration('anz').get<number>('afkIntervalTime') ?? 1000 * 60 * 5; // 3 секунды

type ActivityType = 'AFK' | 'alt+tab';
let previousActiveFile: string | null = null;
let previousLanguageId: string = "unknown";

let isIdle = false;

const onIdle = (type: ActivityType) => {
    isIdle = true;
    const id = type;

    previousActiveFile = getActiveFile();
    previousLanguageId = vscode.window.activeTextEditor?.document.languageId ?? "unknown";

    closeActiveSession(previousActiveFile, timeNow());
    openNewSession(id, "unknown", timeNow());
    setActiveFile(id);
};

export function onIdleEnd() {
    console.log('[onIdleEnd] isIdle:', isIdle, 'prev:', previousActiveFile);

    if (!isIdle || !previousActiveFile) return;

    isIdle = false;
    closeActiveSession(getActiveFile(), timeNow());
    setActiveFile(previousActiveFile);
    openNewSession(previousActiveFile, previousLanguageId, timeNow());
    previousActiveFile = null;
    previousLanguageId = "unknown";
}

export function resetIdleTimer(type: ActivityType) {
    if (idleTimer) {
        clearTimeout(idleTimer);
        onIdleEnd();
    }
    idleTimer = setTimeout(() => onIdle(type), IDLE_TIMEOUT);
}