import { workspace } from "vscode";
import normalizePath from "../../utils/normalizePath";
export const IGNORE_FILE_MIN_DURATION = workspace.getConfiguration('anz').get<number>('ignoreFileMinDuration') ?? 1000 * 60 * 5; // 5 minutes: 1000 * 60 * 5

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

let historyList: HistorySessions = [];
let activeFile: string | null = null;

export function getActiveFile(): string | null {
    return activeFile;
}

export function historySize(): number {
    return historyList.length;
}

export function setActiveFile(file: string | null) {
    activeFile = file;
}

export function getHistory(): HistorySessions {
    return historyList;
}

export function setHistory(sessions: HistorySessions): void {
    historyList = sessions;
}

export function clearHistory(): void {
    historyList = [];
}

/**
 * Filters out sessions with total duration less than the specified minimum duration.
 * Returns a new filtered history without modifying the original.
 */
export function filterHistoryByMinDuration(minDuration: number): void {
    const filtered = historyList.filter(session => {
        const totalDuration = session.intervals.reduce((sum, interval) => {
            const closeTime = interval.close_time ?? Date.now();
            return sum + (closeTime - interval.enter_time);
        }, 0);
        return totalDuration >= minDuration;
    });

    setHistory(filtered);
}   

/**
 * Closes the currently active file's open interval and returns the full history.
 * Throws if there is no active file or no open interval to close.
 */
export function finalizeHistory(): HistorySessions {
    if (!activeFile) {
        throw new Error("No active file to finalize");
    }

    const closed = closeActiveSession(activeFile, Date.now());

    if (IGNORE_FILE_MIN_DURATION) {
        filterHistoryByMinDuration(IGNORE_FILE_MIN_DURATION);
    }

    if (!closed) {
        throw new Error(`Could not close interval for active file: ${activeFile}`);
    }
    
    if (historySize() === 0) {
        throw new Error(`No sessions`);
    }

    return historyList;
}

function createNewSession(pathname: string, name: string, language: string): void {

    const newSession = {
        pathname,
        name,
        language,
        intervals: []
    } as HistorySession;

    historyList.push(newSession);
}

function updateSessionInterval(idx: number) {
    // find and update interval
}

function getOrCreateSession(pathname: string, language: string): HistorySession {
    const normalized = normalizePath(pathname);

    let session = historyList.find(s => normalizePath(s.pathname) === normalized);

    if (!session) {
        const fileName = pathname.split(/[\\/]/).pop() as string;

        // createNewSession()

        session = {
            pathname: normalized,
            name: fileName,
            language,
            intervals: [],
        };

        historyList.push(session);
    } else {
        const fileName = pathname.split(/[\\/]/).pop() as string;
        session.language = language;
        session.name = fileName;

        // update

        const duplicateSessions = historyList.filter(
            s => s !== session && normalizePath(s.pathname) === normalized
        );

        for (const duplicate of duplicateSessions) {
            // may it be here? duplicate
            session.intervals.push(...duplicate.intervals);

            console.log("[INTERVALS ADDED] ", session.intervals);


            const duplicateIndex = historyList.indexOf(duplicate);
            if (duplicateIndex !== -1) {
                historyList.splice(duplicateIndex, 1);
            }
        }
    }

    return session;
}

/**
 * Returns the session for the currently active file, if any.
 */
export function getActiveSession(): HistorySession | undefined {
    if (!activeFile) return undefined;
    const normalized = normalizePath(activeFile);
    return historyList.find(s => normalizePath(s.pathname) === normalized);
}

/**
 * Closes the most recent open interval for a given file path.
 * Returns true if an interval was successfully closed, false otherwise.
 */
export function closeActiveSession(pathname: string | null, closeTime: number): boolean {
    if (!pathname) return false;

    const normalized = normalizePath(pathname);
    const session = historyList.find(s => normalizePath(s.pathname) === normalized);

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
 * Returns the session, or undefined if an interval is already open (no-op).
 */
export function openNewSession(
    filePath: string,
    languageId: string,
    enterTime: number
): HistorySession | undefined {
    const session = getOrCreateSession(filePath, languageId);

    // Don't open a duplicate interval if one is already open for this file
    const lastInterval = session.intervals.at(-1);
    if (lastInterval && lastInterval.close_time === null) {
        console.log("Session already open for:", filePath);
        return session;
    }

    session.intervals.push({ enter_time: enterTime, close_time: null });

    return session;
}