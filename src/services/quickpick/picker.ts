import { commands, QuickPickItem, window } from "vscode";
import { AuthService } from "../auth";
import { LOGIN_COMMAND, LOGOUT_COMMAND, MENU_COMMAND, RESET_TIMER_COMMAND, START_TIMER_COMMAND, STOP_TIMER_COMMAND } from "../../commands";
import { TimerService } from "../timer";

interface Option extends QuickPickItem {
    command: string;
    args?: string[];
}

export async function menuPicker(authService: AuthService, timer: TimerService) {

    const configurationOption: Option = {
        label: '$(gear) Settings',
        command: 'workbench.action.openSettings',
        args: ['@ext:bogduto.anz']
    };

    const resetOption: Option = { label: '$(refresh) Reset Timer', command: RESET_TIMER_COMMAND };

    const timerOption: Option = timer.isRunningState
        ? { label: '$(debug-pause) Stop Timer', command: STOP_TIMER_COMMAND }
        : { label: '$(play) Start Timer', command: START_TIMER_COMMAND };

    const authOption: Option = authService.checkAuth()
        ? { label: "Logout", command: LOGOUT_COMMAND }
        : { label: "Login", command: LOGIN_COMMAND };

    const items: Option[] = [
        timerOption,
        resetOption,
        authOption,
        configurationOption
        // settings
    ];

    const picked = await window.showQuickPick(items, {
        placeHolder: 'Select an action'
    });

    if (!picked) return;

    await commands.executeCommand(picked.command, ...(picked.args ?? []));
}

export function registerMenu(authService: AuthService, timer: TimerService) {
    commands.registerCommand(MENU_COMMAND, async () => {
        await menuPicker(authService, timer);
    });
}