import { HistorySessions } from "../../services/activities/ActivityManager";

export type SessionDTO = {
    name: string;
    language: string;
    pathname: string;
    enter_time: number;
    close_time: number;
}

export const toSessionDTO = (historySessions: HistorySessions): SessionDTO[] => {
    const payload = historySessions.flatMap((session) =>
        session.intervals.map((interval) => ({
            name: session.name,
            language: session.language,
            pathname: session.pathname,
            enter_time: interval.enter_time,
            close_time: interval.close_time ?? 0,
        }))
    );

    return payload;
}