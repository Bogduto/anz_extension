import { TimerFormatter } from "./core";

 class TimerService {
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

export default TimerService;