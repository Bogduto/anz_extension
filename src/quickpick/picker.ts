import { commands, QuickPickItem, window } from "vscode";
import { START_COMMAND, STOP_COMMAND } from "../services/TimerServices";

export const MENU_COMMAND = "anz.menu";

export async function menuPicker() {
    const items: (QuickPickItem & { command: string })[] = [
        { label: '$(play) Start', command: START_COMMAND },
        { label: '$(debug-pause) Pause', command: STOP_COMMAND },
        { label: '$(debug-pause) Pause', command: STOP_COMMAND },
        // { label: '$(debug-continue) Resume', command: 'anzio.stop' }
        // off extension for current session action
        // logout/login
        // settings
    ];

    const picked = await window.showQuickPick(items, {
        placeHolder: 'Select an action'
    });

    if (!picked) return;

    await commands.executeCommand(picked.command);
}