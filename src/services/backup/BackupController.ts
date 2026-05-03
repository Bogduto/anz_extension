import { ExtensionContext } from "vscode";
import { PayloadDTO } from "../../api/dto/payloadDTO";
import { toSessionDTO } from "../../api/dto/sessionDTO";
import { Workspace, toWorkspaceDTO } from "../../api/dto/workspaceDTO";
import { getUserId, insertActivity } from "../../lib/supabase";
import { workspaceMetadata } from "../../utils/metadata";
import { titleFromPathname } from "../../utils/tittle";
import { getHistory, getActiveFile, closeActiveSession, openNewSession, getActiveSession, clearHistory } from "../activities/ActivityManager";
import { TimerService } from "../timer";
import { saveSession, clearSession, restoreSession, BackupData, BACKUP_INTERVAL } from "./BackupService";

let backupInterval: NodeJS.Timeout | undefined;

export function runBackupCircle(ctx: ExtensionContext, timerService: TimerService): void {
    if (backupInterval) return;

    backupInterval = setInterval(async () => {
        try {
            console.log("[CIRCLE] Updated");

            const history = getHistory();
            const elapsed = timerService.getElapsedMs();

            // Skip save if timer isn't running or history is empty — nothing worth persisting
            if (!timerService.isRunningState || history.length === 0) {
                console.log(`[IF] Skipping — running: ${timerService.isRunningState}, history len: ${history.length}`);
                return;
            }

            const activeFile = getActiveFile();
            const activeSession = getActiveSession();
            const now = Date.now();

            // Temporarily close the active interval so the snapshot has a clean end time,
            // then immediately reopen it so tracking continues uninterrupted.
            if (activeFile && activeSession) {
                closeActiveSession(activeFile, now);
            }

            const data: BackupData = {
                timer: elapsed,
                history,
            };

            console.log(`[DATA] Saving snapshot, elapsed: ${elapsed}ms`);

            await saveSession(ctx, data);

            // Reopen the interval after saving so the session continues
            if (activeFile && activeSession) {
                openNewSession(activeFile, activeSession.language, now);
            }
        } catch (error) {
            console.error("[backup] Error saving session:", error);
        }
    }, BACKUP_INTERVAL);
}

export function stopBackupCircle(ctx: ExtensionContext): void {
    if (backupInterval) {
        clearInterval(backupInterval);
        backupInterval = undefined;
        console.log("[CIRCLE] Stopped");
    }

    clearHistory();
    clearSession(ctx);
}

export async function autoRestore(ctx: ExtensionContext, timer: TimerService): Promise<void> {
    const response = await restoreSession<BackupData>(ctx);

    if (!response) return;

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
    const workspaceDTO = toWorkspaceDTO({ ...p_workspace, name: workspaceTitle });

    const payload: PayloadDTO = {
        p_activity_id: null,
        p_workspace: workspaceDTO,
        p_start: response.timer,
        p_sessions: sessionDTO,
    };

    await insertActivity(payload);

    clearSession(ctx);
}