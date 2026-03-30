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

export default TimerFormatter;