import * as vscode from 'vscode';
import { handleChangeIgnoreFileMinDuration } from '../activities/ActivityManager';
import { handleChangeBackupInterval } from '../backup/BackupService';
import { handleChangeIdleTimeout } from '../activities/AfkManager';
import { isDevelopment } from '../../utils/envHelper';

export default function settingsController() {
    const DEFAULT = 1000 * 60 * 5;

    return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('anz.ignoreFileMinDuration')) {
                const newValue = vscode.workspace.getConfiguration('anz').get<number>('ignoreFileMinDuration') ?? DEFAULT;
                handleChangeIgnoreFileMinDuration(newValue)

                if (isDevelopment) {
                    console.log("new value", newValue)
                }
            } 

            if (e.affectsConfiguration('anz.backupInterval')) {
                const newValue = vscode.workspace.getConfiguration('anz').get<number>('backupInterval') ?? DEFAULT;
                handleChangeBackupInterval(newValue)
                
                if (isDevelopment) {
                    console.log("new value", newValue)
                }
            }

            if (e.affectsConfiguration('anz.afkIntervalTime')) {
                const newValue = vscode.workspace.getConfiguration('anz').get<number>('afkIntervalTime') ?? DEFAULT;
                handleChangeIdleTimeout(newValue)
                
                if (isDevelopment) {
                    console.log("new value", newValue)
                }
            }
        });
}