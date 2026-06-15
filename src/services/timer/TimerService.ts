import { EventEmitter } from "vscode";
import { PreciseTimer, TimerFormatter } from "./core";
import { getUserId, insertActivity } from "../../lib/supabase";
import { titleFromPathname } from "../../utils/tittle";
import ActivityManager from "../activities/ActivityManager";
import { workspaceMetadata } from "../../utils/metadata";
import { toSessionDTO } from "../../api/dto/sessionDTO";
import { Workspace } from "../../api/dto/workspaceDTO";
import { PayloadDTO } from "../../api/dto/payloadDTO";
import { isDevelopment } from "../../utils/envHelper";

class TimerService {
    private isRunning = false;
    private activityId: number | null = null;
    private _onDidUpdateTime = new EventEmitter<boolean>();
    public readonly onDidUpdateTime = this._onDidUpdateTime.event;

    constructor(
        private preciseTimer: PreciseTimer,
        private activityManager: ActivityManager
    ) { }

    public start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.preciseTimer.start();
        this._onDidUpdateTime.fire(true);
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.preciseTimer.pause();

        const ishistoryEmpty = this.activityManager.historySize() === 0;

        if (ishistoryEmpty) {
            this._onDidUpdateTime.fire(false);
            return;
        }

        try {
            const historySessions = this.activityManager.finalizeHistory();

            const userId = await getUserId();
            const workspace = await workspaceMetadata();
            const workspaceTitle = titleFromPathname(workspace.name);

            const p_workspace = {
                user_id: userId,
                ...workspace
            } as Workspace;

            const p_start = this.preciseTimer.startTimeStamp;

            const sessionDTO = toSessionDTO(historySessions);

            const payload: PayloadDTO = {
                p_activity_id: this.activityId ?? null,
                p_workspace: { ...p_workspace, name: workspaceTitle },
                p_start,
                p_sessions: sessionDTO
            };

            if (isDevelopment) {
                console.log("Payload for stop:", payload);
                this.activityId = 1;
            } else {
                console.log("PAYLOAD: ", payload);
                const v_activity_id = await insertActivity(payload);
                this.activityId = v_activity_id;
            }
        } finally {
            this.activityManager.clearHistory();
            this._onDidUpdateTime.fire(false);
        }
    }

    public async reset(): Promise<void> {
        this.isRunning = false;
        this.preciseTimer.reset();
        this._onDidUpdateTime.fire(false);

        if (this.activityManager.historySize() === 0) {
            this.activityId = null;
            return;
        }

        try {
            const historySessions = this.activityManager.finalizeHistory();

            const userId = await getUserId();
            const workspace = await workspaceMetadata();
            const workspaceTitle = titleFromPathname(workspace.name);

            const p_workspace = {
                user_id: userId,
                ...workspace
            } as Workspace;

            const p_start = this.preciseTimer.startTimeStamp;

            const sessionDTO = toSessionDTO(historySessions);

            const payload = {
                p_activity_id: null,
                p_workspace: { ...p_workspace, name: workspaceTitle },
                p_start,
                p_sessions: sessionDTO
            } as PayloadDTO;

            if (isDevelopment) {
                console.log("Payload for reset:", payload);
            } else {
                await insertActivity(payload);
            }
        } finally {
            this.activityManager.clearHistory();
            this.activityId = null;
        }
    }

    public startTimeStamp(): number {
        return this.preciseTimer.startTimeStamp;
    }

    public getElapsedMs(): number {
        return this.preciseTimer.elapsedMs;
    }

    public get isRunningState(): boolean {
        return this.isRunning;
    }

    public getState(): {
        text: string;
        active: boolean;
    } {
        return {
            text: `$(watch) ${TimerFormatter.format(this.getElapsedMs(), { showHours: true })}`,
            active: this.isRunning
        };
    }
}

export default TimerService;
