import { timeNow } from "../../../utils/time";

class PreciseTimer {
    private _startTime: number = performance.now(); // used for UI 
    private _startTimeStamp: number = timeNow(); // used for service 
    private _pausedTime: number = 0;
    private _isPaused: boolean = true;
    private _isStopped: boolean = false;

    reset(): void {
        this._startTime = performance.now();
        this._startTimeStamp = timeNow();
        this._pausedTime = 0;
        this._isPaused = true;
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

    restore(savedElapsedMs: number): void {
        this._pausedTime = savedElapsedMs;
    }

    get startTime(): number {
        return this._startTime;
    }

    get startTimeStamp(): number {
        return this._startTimeStamp;
    }

    get elapsedMs(): number {
        if (this._isStopped) return 0;
        if (this._isPaused) return this._pausedTime;

        return this._pausedTime + (performance.now() - this._startTime);
    }

    get elapsedSeconds(): number {
        return this.elapsedMs / 1000;
    }
}

export default PreciseTimer;