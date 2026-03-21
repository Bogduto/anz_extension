import { commands, ExtensionContext, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { Notification } from "./NotificationService";
import { MENU_COMMAND } from "../quickpick/picker";
import { insertNewSlice } from "../api";
import { SessionService } from "./DirectoryService";
import { AuthService } from "./AuthService";
import { History } from "./HistoryService";

export const START_COMMAND = "anz.start";
export const STOP_COMMAND = "anz.stop";

class TimerFormatter {
    public static format(elapsedMs: number, options: {
        showHours?: boolean;
        showMillis?: boolean;
        showTenths?: boolean;
    } = {}): string {
        const {
            showHours = true,
            showMillis = false,
            showTenths = false,
        } = options;

        let totalSeconds = Math.floor(elapsedMs / 1000);
        const ms = showMillis
            ? elapsedMs % 1000
            : showTenths
                ? Math.floor((elapsedMs % 1000) / 100)
                : 0;

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (showHours || h > 0) {
            return showMillis
                ? `${h.toString().padStart(2, "0")}:${m
                    .toString()
                    .padStart(2, "0")}:${s
                        .toString()
                        .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
                : showTenths
                    ? `${h.toString().padStart(2, "0")}:${m
                        .toString()
                        .padStart(2, "0")}:${s
                            .toString()
                            .padStart(2, "0")}.${ms}`
                    : `${h.toString().padStart(2, "0")}:${m
                        .toString()
                        .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        } else {
            return showMillis
                ? `${m.toString().padStart(2, "0")}:${s
                    .toString()
                    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
                : showTenths
                    ? `${m.toString().padStart(2, "0")}:${s
                        .toString()
                        .padStart(2, "0")}.${ms}`
                    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
    }
}

export class PreciseTimer {
    private _startTime: number = performance.now();
    private _pausedTime: number = 0;
    private _isPaused: boolean = true;
    private _isStopped: boolean = false;

    reset(): void {
        this._startTime = performance.now();
        this._pausedTime = 0;
        this._isPaused = false;
        this._isStopped = false;
    }

    pause(): void {
        if (this._isPaused || this._isStopped) return;
        this._pausedTime += performance.now() - this._startTime;
        this._isPaused = true;
    }

    start(): void {
        if (!this._isPaused || this._isStopped) return;
        this._startTime = performance.now();
        this._isPaused = false;
    }

    stop(): void {
        this._isStopped = true;
        this._isPaused = true;
    }

    get elapsedMs(): number {
        if (this._isStopped) return 0;
        if (this._isPaused) return this._pausedTime;

        return this._pausedTime + (performance.now() - this._startTime);
    }

    get elapsedSeconds(): number {
        return this.elapsedMs / 1000;
    }

    format(options: {
        showHours?: boolean;
        showMillis?: boolean;
        showTenths?: boolean;
    } = {}): string {
        const {
            showHours = true,
            showMillis = false,
            showTenths = false,
        } = options;

        let totalSeconds = Math.floor(this.elapsedMs / 1000);
        const ms = showMillis
            ? this.elapsedMs % 1000
            : showTenths
                ? Math.floor((this.elapsedMs % 1000) / 100)
                : 0;

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (showHours || h > 0) {
            return showMillis
                ? `${h.toString().padStart(2, "0")}:${m
                    .toString()
                    .padStart(2, "0")}:${s
                        .toString()
                        .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
                : showTenths
                    ? `${h.toString().padStart(2, "0")}:${m
                        .toString()
                        .padStart(2, "0")}:${s
                            .toString()
                            .padStart(2, "0")}.${ms}`
                    : `${h.toString().padStart(2, "0")}:${m
                        .toString()
                        .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        } else {
            return showMillis
                ? `${m.toString().padStart(2, "0")}:${s
                    .toString()
                    .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
                : showTenths
                    ? `${m.toString().padStart(2, "0")}:${s
                        .toString()
                        .padStart(2, "0")}.${ms}`
                    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
    }
}

export class TimerView {
    private statusBarItem: StatusBarItem;
    private intervalId?: NodeJS.Timeout;

    constructor(
        private readonly statusService: TimerService
    ) {
        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Right,
            100
        );
    }

    public register(context: ExtensionContext): void {
        this.statusBarItem.show();
        this.statusBarItem.command = MENU_COMMAND;
        context.subscriptions.push(this.statusBarItem);

        this.intervalId = setInterval(() => {
            this.render();
        }, 100);

        context.subscriptions.push({
            dispose: () => {
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                }
            }
        });
    }

    private render(): void {
        const state = this.statusService.getState();
        this.statusBarItem.text = state.text;
    }
}

export class TimerService {
    private isRunning = false;

    constructor(
        private readonly preciseTimer: PreciseTimer,
        private sessionService: SessionService,
        private history: History
    ) { }

    public toggle(): void {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    public start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.preciseTimer.start();
        Notification.timerStart();
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.preciseTimer.pause();
        Notification.timerStop();

        const sessionId = await this.sessionService.getOrCreateSession() as number;
        const start = Date.now();

        const files = [...this.history.files] as string[];
        const langs = [...this.history.langs] as string[];

        await insertNewSlice(sessionId, start, files, langs);

        this.history.clearAll();
    }

    public getElapsedMs(): number {
        return this.preciseTimer.elapsedMs;
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

export async function timerController(ctx: ExtensionContext, auth: AuthService, timer: PreciseTimer, service: TimerService, view: TimerView): Promise<void> {
    // const timer = new PreciseTimer();
    // const service = new TimerService(timer);
    // const view = new TimerView(service);

    view.register(ctx);

    ctx.subscriptions.push(
        commands.registerCommand(START_COMMAND, async () => {

            // auth check before starting the timer
            const isLoggedIn = auth.checkAuth();

            if (isLoggedIn) {
                service.start();
                return;
            }

            window.showInformationMessage("Please log in first");
        }),

        commands.registerCommand(STOP_COMMAND, async () => {
            try {
                await service.stop();
            } catch (error) {
                window.showInformationMessage(error.message);
            }
        }),
    );

    const isLoggedIn = await commands.executeCommand<boolean>("anz.CHECK_AUTH");

    // move it to extension.ts and execute as an command
    if (isLoggedIn) {
        service.start();
        console.log("Timer started automatically");
    } else {
        console.log("User not logged in, timer not started");
    }
}