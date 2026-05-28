import { SessionDTO } from "./sessionDTO";
import { Workspace } from "./workspaceDTO";

export type PayloadDTO = {
    p_activity_id: number | null; // optional for insert, required for update
    p_workspace: Workspace;
    p_start: number;
    p_sessions: SessionDTO[];
}
