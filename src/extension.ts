import * as vscode from 'vscode';
import { registerMenu } from './services/quickpick/picker';
import { authController, AuthManager, AuthService } from './services/auth';
import { timerController, TimerService, TimerView } from './services/timer';
import { PreciseTimer } from './services/timer/core';
import BackupController from './services/backup/BackupController';
import ActivityManager from './services/activities/ActivityManager';
import AfkManager from './services/activities/AfkManager';
import activitiesRegistrationController from './services/activities/Activitycontroller';
import settingsController from './services/settings/SettingsController';

export async function activate(ctx: vscode.ExtensionContext) {
    
    // auth
    const authManager = new AuthManager(ctx);
    const authService = new AuthService(authManager);

    // activity tracking
    const activityManager = new ActivityManager();

    // timer
    const timer = new PreciseTimer();
    const service = new TimerService(timer, activityManager);

    const afkManager = new AfkManager(activityManager, () => service.isRunningState);
    const view = new TimerView(service);

    // backup
    const backupController = new BackupController(ctx, service, activityManager, authManager);

    // controllers
    authController(ctx, authManager, authService);
    timerController(ctx, view, service, authManager, backupController);

    activitiesRegistrationController(service, activityManager, afkManager);

    registerMenu(authService, service);

    backupController.autoRestore(); // one time restore on extension start

    settingsController()
}

export function deactivate() {
}
