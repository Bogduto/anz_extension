import { StatusBarItem, window, StatusBarAlignment, ExtensionContext } from "vscode";
import { TimerService } from "./index";
import { MENU_COMMAND } from "../../commands";
class TimerView {
    private statusBarItem: StatusBarItem;
    private intervalId?: NodeJS.Timeout;
    constructor(
        private readonly statusService: TimerService
    ) {
        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Right,
            100
        );
    }

    public isRestored() {
        this.statusService.onDidUpdateTime((isRunning) => {
            if (isRunning) {
                this.render();
            }
        })
    }

    public register(context: ExtensionContext): void {
        this.statusBarItem.show();
        this.statusBarItem.command = MENU_COMMAND;

        context.subscriptions.push(this.statusBarItem);

        this.intervalId = setInterval(() => {
            this.render();
        }, 100);

        context.subscriptions.push({
            dispose: () => {
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                }
            }
        });
    }
    private render(): void {
        const state = this.statusService.getState();
        this.statusBarItem.text = state.text;
    }
}
export default TimerView;