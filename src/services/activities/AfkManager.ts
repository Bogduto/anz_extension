import { workspace } from "vscode";
import { timeNow } from "../../utils/time";
import ActivityManager from "./ActivityManager";
import * as vscode from 'vscode';

type ActivityType = 'AFK' | 'alt+tab';

export let IDLE_TIMEOUT = workspace.getConfiguration('anz').get<number>('afkIntervalTime') ?? 1000 * 60 * 5; // 5 minutes

export const handleChangeIdleTimeout = (newValue: number) => {
    IDLE_TIMEOUT = newValue;
}

class AfkManager {
    private idleTimer: NodeJS.Timeout | undefined;
    private previousActiveFile: string | null = null;
    private previousLanguageId: string = "unknown";
    private isIdle: boolean = false;

    constructor(private activityManager: ActivityManager, private isTimerRunning: () => boolean) { }

    private onIdle(type: ActivityType): void {
        this.isIdle = true;

        this.previousActiveFile = this.activityManager.getActiveFile();
        this.previousLanguageId = vscode.window.activeTextEditor?.document.languageId ?? "unknown";

        if (!this.previousActiveFile || !this.isTimerRunning()) return;

        this.activityManager.closeActiveSession(this.previousActiveFile, timeNow());
        this.activityManager.openNewSession(type, "unknown", timeNow());
        this.activityManager.setActiveFile(type);
    }

    private onIdleEnd(): void {
        if (!this.isIdle) return;

        this.isIdle = false;

        if (!this.previousActiveFile) return;

        this.activityManager.closeActiveSession(this.activityManager.getActiveFile(), timeNow());
        this.activityManager.setActiveFile(this.previousActiveFile);
        this.activityManager.openNewSession(this.previousActiveFile, this.previousLanguageId, timeNow());
        this.previousActiveFile = null;
        this.previousLanguageId = "unknown";
    }

    public resetIdleTimer(type: ActivityType): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            if (this.isIdle) {
                this.onIdleEnd();
            }
        }
        this.idleTimer = setTimeout(() => this.onIdle(type), IDLE_TIMEOUT);
    }
}

export default AfkManager;
