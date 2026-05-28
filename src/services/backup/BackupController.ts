import { ExtensionContext } from "vscode";
import { PayloadDTO } from "../../api/dto/payloadDTO";
import { toSessionDTO } from "../../api/dto/sessionDTO";
import { Workspace } from "../../api/dto/workspaceDTO";
import { getUserId, insertActivity } from "../../lib/supabase";
import { workspaceMetadata } from "../../utils/metadata";
import { titleFromPathname } from "../../utils/tittle";
import ActivityManager from "../activities/ActivityManager";
import { TimerService } from "../timer";
import { saveSession, clearSession, restoreSession, BackupData, BACKUP_INTERVAL } from "./BackupService";
import { AuthManager } from "../auth";

class BackupController {
    private backupInterval: NodeJS.Timeout | undefined;

    constructor(
        private ctx: ExtensionContext,
        private timerService: TimerService,
        private activityManager: ActivityManager,
        private auth: AuthManager
    ) { }

    public run(): void {
        if (this.backupInterval) return;

        this.backupInterval = setInterval(async () => {
            try {
                console.log("[CIRCLE] Updated");

                const history = this.activityManager.getHistory();
                const elapsed = this.timerService.startTimeStamp();

                // Skip save if timer isn't running or history is empty — nothing worth persisting
                if (!this.timerService.isRunningState || history.length === 0) {
                    return;
                }

                const activeFile = this.activityManager.getActiveFile();
                const activeSession = this.activityManager.getActiveSession();
                const now = Date.now();

                // Temporarily close the active interval so the snapshot has a clean end time,
                // then immediately reopen it so tracking continues uninterrupted.
                if (activeFile && activeSession) {
                    this.activityManager.closeActiveSession(activeFile, now);
                }

                const data: BackupData = {
                    startTimeStamp: elapsed,
                    history,
                };

                await saveSession(this.ctx, data as unknown as Record<string, unknown>);

                // Reopen the interval after saving so the session continues
                if (activeFile && activeSession) {
                    this.activityManager.openNewSession(activeFile, activeSession.language, now);
                }
            } catch (error) {
                console.error("[backup] Error saving session:", error);
            }
        }, BACKUP_INTERVAL);
    }

    public stop(): void {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = undefined;
            console.log("[CIRCLE] Stopped");
        }

        this.activityManager.clearHistory();
        clearSession(this.ctx);
    }

    public async autoRestore(): Promise<void> {
        const response = await restoreSession<BackupData>(this.ctx);

        if (!response) return;
        if (!this.auth.isLoggedIn) return;

        const [userId, workspace] = await Promise.all([
            getUserId(),
            workspaceMetadata(),
        ]);

        const workspaceTitle = titleFromPathname(workspace.name);

        const p_workspace: Workspace = {
            user_id: userId,
            ...workspace,
        };

        const sessionDTO = toSessionDTO(response.history);

        const payload: PayloadDTO = {
            p_activity_id: null,
            p_workspace: { ...p_workspace, name: workspaceTitle },
            p_start: response.startTimeStamp,
            p_sessions: sessionDTO,
        };

        await insertActivity(payload);

        clearSession(this.ctx);
    }
}

export default BackupController;
