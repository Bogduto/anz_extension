import { EventEmitter, languages, window } from "vscode";
import { PreciseTimer, TimerFormatter } from "./core";
import { getUserId, insertActivity, supabase } from "../../lib/supabase";
import { titleFromPathname } from "../../utils/tittle";
import { clearHistory, finalizeHistory, getHistory, historySize } from "../activities/ActivityManager";
import { workspaceMetadata } from "../../utils/metadata";
import { toSessionDTO } from "../../api/dto/sessionDTO";
import { toWorkspaceDTO, Workspace } from "../../api/dto/workspaceDTO";
import { PayloadDTO } from "../../api/dto/payloadDTO";
import { NODE_ENV } from "../../extension";

let activity_id: number | null = null;

class TimerService {
    private isRunning = false;
    private _onDidUpdateTime = new EventEmitter<boolean>();
    public readonly onDidUpdateTime = this._onDidUpdateTime.event;

    constructor(
        private preciseTimer: PreciseTimer
    ) { }

    public toggle(): void {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    public startTime() {
        return this.preciseTimer.startTime;
    }

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

        const historySessions = finalizeHistory();

        const userId = await getUserId();

        const workspace = await workspaceMetadata();

        const workspaceTitle = titleFromPathname(workspace.name);

        const p_workspace = {
            user_id: userId,
            ...workspace
        } as Workspace;


        const p_start = this.preciseTimer.startTimeStamp;

        const sessionDTO = toSessionDTO(historySessions);
        const workspaceDTO = toWorkspaceDTO({ ...p_workspace, name: workspaceTitle });


        const payload: PayloadDTO = {
            p_activity_id: activity_id ?? null,
            p_workspace: workspaceDTO,
            p_start,
            p_sessions: sessionDTO
        };

        if (NODE_ENV === "debug") {
            const v_activity_id = 1;
            activity_id = v_activity_id;
            return;
        }

        console.log("Payload for stop:", payload);

        const v_activity_id = await insertActivity(payload);
        activity_id = v_activity_id;

        clearHistory();
        this._onDidUpdateTime.fire(false);

    }

    public async reset(): Promise<void> {
        this.isRunning = false;
        this.preciseTimer.reset();
        this._onDidUpdateTime.fire(false);

        const size = historySize();

        if (size !== 0) {
            const historySessions = finalizeHistory();

            const userId = await getUserId();
            const workspace = await workspaceMetadata();

            const workspaceTitle = titleFromPathname(workspace.name);
            const p_workspace = {
                user_id: userId,
                ...workspace
            } as Workspace;

            const p_start = this.preciseTimer.startTimeStamp;

            const sessionDTO = toSessionDTO(historySessions);
            const workspaceDTO = toWorkspaceDTO({ ...p_workspace, name: workspaceTitle });

            const payload = {
                p_activity_id: null,
                p_workspace: workspaceDTO,
                p_start: p_start,
                p_sessions: sessionDTO
            } as PayloadDTO;

            if (NODE_ENV === "debug") {
                console.log("Payload for reset:", payload);
                return;
            }

            await insertActivity(payload);

            clearHistory();
        }

        activity_id = null;
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