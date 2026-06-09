import { workspace } from "vscode";
import normalizePath from "../../utils/normalizePath";
import { isDevelopment } from "../../utils/envHelper";

export let IGNORE_FILE_MIN_DURATION = workspace.getConfiguration('anz').get<number>('ignoreFileMinDuration') ?? 1000 * 60 * 5; // 5 minutes

export const handleChangeIgnoreFileMinDuration = (newValue: number) => {
    IGNORE_FILE_MIN_DURATION = newValue
}

export type TimeInterval = {
    enter_time: number;
    close_time: number | null;
};

export type HistorySession = {
    intervals: TimeInterval[];
    language: string;
    name: string;
    pathname: string;
};

export type HistorySessions = HistorySession[];

class ActivityManager {
    private historyList: HistorySessions = [];
    private activeFile: string | null = null;

    public getActiveFile(): string | null {
        return this.activeFile;
    }

    public setActiveFile(file: string | null): void {
        this.activeFile = file;
    }

    public getHistory(): HistorySessions {
        return this.historyList;
    }

    public setHistory(sessions: HistorySessions): void {
        this.historyList = sessions;
    }

    public clearHistory(): void {
        this.historyList = [];
    }

    public historySize(): number {
        return this.historyList.length;
    }

    /**
     * Filters out sessions with total duration less than the specified minimum duration.
     */
    public filterHistoryByMinDuration(minDuration: number): void {
        const filtered = this.historyList.filter(session => {
            const totalDuration = session.intervals.reduce((sum, interval) => {
                const closeTime = interval.close_time ?? Date.now();
                return sum + (closeTime - interval.enter_time);
            }, 0);
            return totalDuration >= minDuration;
        });

        this.historyList = filtered;
    }

    /**
     * Closes the currently active file's open interval and returns the full history.
     * Throws if there is no active file or all sessions are filtered out.
     */
    public finalizeHistory(): HistorySessions {
        if (!this.activeFile) {
            throw new Error("No active file to finalize");
        }

        const closed = this.closeActiveSession(this.activeFile, Date.now());

        if (IGNORE_FILE_MIN_DURATION && !isDevelopment) {
            this.filterHistoryByMinDuration(IGNORE_FILE_MIN_DURATION);
        }

        if (!closed) {
            throw new Error(`Could not close interval for active file: ${this.activeFile}`);
        }

        if (this.historySize() === 0) {
            console.log("All sessions were filtered out by minimum duration. Returning empty history.", this.getHistory());
            throw new Error(`No sessions`);
        }

        return this.historyList;
    }

    private getOrCreateSession(pathname: string, language: string): HistorySession {
        const normalized = normalizePath(pathname);

        let session = this.historyList.find(s => normalizePath(s.pathname) === normalized);

        if (!session) {
            const fileName = pathname.split(/[\\/]/).pop() as string;

            session = {
                pathname: normalized,
                name: fileName,
                language,
                intervals: [],
            };

            this.historyList.push(session);
        } else {
            const fileName = pathname.split(/[\\/]/).pop() as string;
            session.language = language;
            session.name = fileName;

            const duplicateSessions = this.historyList.filter(
                s => s !== session && normalizePath(s.pathname) === normalized
            );

            for (const duplicate of duplicateSessions) {
                session.intervals.push(...duplicate.intervals);
                console.log("[INTERVALS ADDED] ", session.intervals);

                const duplicateIndex = this.historyList.indexOf(duplicate);
                if (duplicateIndex !== -1) {
                    this.historyList.splice(duplicateIndex, 1);
                }
            }
        }

        return session;
    }

    /**
     * Returns the session for the currently active file, if any.
     */
    public getActiveSession(): HistorySession | undefined {
        if (!this.activeFile) return undefined;
        const normalized = normalizePath(this.activeFile);
        return this.historyList.find(s => normalizePath(s.pathname) === normalized);
    }

    /**
     * Closes the most recent open interval for a given file path.
     * Returns true if an interval was successfully closed, false otherwise.
     */
    public closeActiveSession(pathname: string | null, closeTime: number): boolean {
        console.log('[closeActiveSession]', normalizePath(pathname ?? 'null'));

        if (!pathname) return false;

        const normalized = normalizePath(pathname);
        const session = this.historyList.find(s => normalizePath(s.pathname) === normalized);

        if (!session) return false;

        const lastInterval = session.intervals.findLast(i => i.close_time === null);

        if (!lastInterval) return false;

        lastInterval.close_time = closeTime;
        console.log(`Closed interval ${normalized}:`, lastInterval);

        return true;
    }

    /**
     * Opens a new interval for the given file.
     * Does NOT close any previous session — the caller is responsible for that.
     * Returns the session, or the existing session if an interval is already open (no-op).
     */
    public openNewSession(
        filePath: string,
        languageId: string,
        enterTime: number
    ): HistorySession | undefined {
        console.log('[openNewSession]', normalizePath(filePath));

        const session = this.getOrCreateSession(filePath, languageId);

        const lastInterval = session.intervals.at(-1);
        if (lastInterval && lastInterval.close_time === null) {
            console.log("Session already open for:", filePath);
            return session;
        }

        session.intervals.push({ enter_time: enterTime, close_time: null });

        return session;
    }
}

export default ActivityManager;
