import { SessionDTO } from "./sessionDTO";
import { WorkspaceDTO } from "./workspaceDTO";

export type PayloadDTO = {
    p_activity_id: number | null; // optional for insert, required for update
    p_workspace: WorkspaceDTO
    p_start: number;
    p_sessions: SessionDTO[];
}
