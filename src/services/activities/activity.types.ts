
interface Session {
    enter_time: Date;
    close_time: Date | null;
}

interface File {
    language: string,
    pathname: string,
    name: string,

    sessions: Session[]
}

export interface Activity {
    start: number;
    end: number;
    files: File[];
}