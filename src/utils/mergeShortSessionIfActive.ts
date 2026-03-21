// Short sessions under 10 minutes are merged with the current one if the user remains active.
// Ask the user if they want to merge the sessions or keep them separate. If they choose to merge, update the current session's duration and reset the timer. If they choose to keep them separate, start a new session as usual.

const MERGE_LIMIT = 10 * 60; // 10 minutes in seconds