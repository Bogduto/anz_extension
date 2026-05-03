import * as vscode from 'vscode';
import { registerMenu } from './services/quickpick/picker';
import { authController, AuthManager, AuthService } from './services/auth';
import { timerController, TimerService, TimerView } from './services/timer';
import { PreciseTimer } from './services/timer/core';
import { autoRestore } from './services/backup/BackupController';
import activitiesRegistrationController from './services/activities/Activitycontroller';

export const NODE_ENV = process.env.NODE_ENV as "production" | "debug";

export async function activate(ctx: vscode.ExtensionContext) {

    // auth
    const authManager = new AuthManager(ctx);
    const authService = new AuthService(authManager);
    // time
    const timer = new PreciseTimer();
    const service = new TimerService(timer);
    const view = new TimerView(service);

    // controllers

    authController(ctx, authManager, authService);
    timerController(ctx, view, service, authManager);

    activitiesRegistrationController(service);

    // use _isStopped from timer into register to make timer command toggle start/stop
    registerMenu(authService, service);

    // autoRestore(ctx, service); // one time restore on extension start
}

export function deactivate() {
}

