import { ExtensionContext, Uri, workspace } from "vscode";
import * as path from 'path';
import { HistorySessions } from "../activities/ActivityManager";

export const BACKUP_FILE_NAME = 'backup.json';
export const BACKUP_INTERVAL = workspace.getConfiguration('anz').get<number>('backupInterval') ?? 1000 * 60 * 5; // 5 minutes: 1000 * 60 * 5

export interface BackupData {
    timer: number;
    history: HistorySessions;
}

const getBackupFolder = (ctx: ExtensionContext): Uri => {
    return Uri.file(ctx.globalStorageUri.fsPath);
};

const getBackupPath = (ctx: ExtensionContext): Uri => {
    // ctx.globalStorageUri.fsPath is a string — must use .fsPath, not the Uri object
    return Uri.file(path.join(ctx.globalStorageUri.fsPath, BACKUP_FILE_NAME));
};

async function writeSession(folder: Uri, filePath: Uri, data: Record<string, unknown>): Promise<void> {
    try {
        await workspace.fs.createDirectory(folder);
        await workspace.fs.writeFile(
            filePath,
            Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
        );
    } catch (error) {
        console.error('[backup] Error writing session data:', error);
    }
}

async function getSession<T>(fileUri: Uri): Promise<T | null> {
    try {
        const raw = await workspace.fs.readFile(fileUri);
        const text = Buffer.from(raw).toString('utf-8');
        return JSON.parse(text) as T;
    } catch (e: any) {
        // EntryNotFound is normal on first run — not a real error
        if (e?.code !== 'FileNotFound' && e?.name !== 'EntryNotFound (FileSystemError)') {
            console.error('[backup] Failed to read session file:', e);
        }
        return null;
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns true if a backup file exists. */
export const hasBackup = async (ctx: ExtensionContext): Promise<boolean> => {
    try {
        await workspace.fs.stat(getBackupPath(ctx));
        return true;
    } catch {
        return false;
    }
};

/** Persist current session data to disk. */
export async function saveSession(ctx: ExtensionContext, data: Record<string, unknown>): Promise<void> {
    const filePath = getBackupPath(ctx);
    const folder = getBackupFolder(ctx);
    await writeSession(folder, filePath, data); // folder first, then filePath — matches writeSession signature
}

/** Read and return the saved session, or null if none exists. */
export async function restoreSession<T>(ctx: ExtensionContext): Promise<T | null> {
    const filePath = getBackupPath(ctx);
    return getSession<T>(filePath);
}

/** Delete the backup file. */
export async function clearSession(ctx: ExtensionContext): Promise<void> {
    try {
        await workspace.fs.delete(getBackupPath(ctx), { useTrash: false });
    } catch (e: any) {
        if (e?.code !== 'FileNotFound' && e?.name !== 'EntryNotFound (FileSystemError)') {
            console.error('[backup] Error clearing session data:', e);
        }
    }
}


