class PreciseTimer {
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

export default PreciseTimer;