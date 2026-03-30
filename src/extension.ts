import * as vscode from 'vscode';
import { PreciseTimer, timerController, TimerService, TimerView } from './services/TimerServices';
import { MENU_COMMAND, menuPicker } from './quickpick/picker';

import { directoryController, DirectoryManager, DirectoryService, SessionManager, SessionService } from './services/DirectoryService';
import { History } from './services/HistoryService';
import { authController, AuthManager, AuthService } from './services/auth';


export async function activate(ctx: vscode.ExtensionContext) {
	// auth
	const authSessionMenager = new AuthManager(ctx);
	const authService = new AuthService(authSessionMenager);

	// directory
	const sessionManager = new SessionManager();
	const sessionService = new SessionService(sessionManager, authService);

	// Directory History

	const history = new History(); // files, langs

	const directoryManager = new DirectoryManager();
	const directoryService = new DirectoryService(directoryManager, sessionService, authService, history);

	// time
	const timer = new PreciseTimer();
	const service = new TimerService(timer, sessionService, history);
	const view = new TimerView(service);

	// controllers

	authController(ctx, authSessionMenager, authService);
	timerController(ctx, authService, timer, service, view);
	directoryController(ctx, directoryService);

	vscode.commands.registerCommand(MENU_COMMAND, async () => {
		await menuPicker();
	});

}

export function deactivate() { }
