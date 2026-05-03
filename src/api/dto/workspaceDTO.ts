export type Workspace = {
    user_id: string;
    name: string;
    href: string;
}

export type WorkspaceDTO = {
    user_id: string;
    name: string;
    href: string;
}

export const toWorkspaceDTO = (workspace: Workspace): WorkspaceDTO => {
    const payload = {
        user_id: workspace.user_id,
        name: workspace.name,
        href: workspace.href
    } as WorkspaceDTO;

    return payload;
}