import { ExtensionContext, commands, window } from "vscode";
import { TimerService, TimerView } from ".";
import { AuthManager } from "../auth";
import { START_TIMER_COMMAND, STOP_TIMER_COMMAND, RESET_TIMER_COMMAND } from "../../commands";
import BackupController from "../backup/BackupController";

async function timerController(
    ctx: ExtensionContext,
    timerView: TimerView,
    timerService: TimerService,
    authManager: AuthManager,
    backupController: BackupController
): Promise<void> {
    timerView.register(ctx);

    ctx.subscriptions.push(
        commands.registerCommand(START_TIMER_COMMAND, async () => {
            try {
                if (!authManager.isLoggedIn) {
                    throw new Error("You must be logged in to start the timer.");
                }

                timerService.start();
                backupController.run();
            } catch (error) {
                window.showErrorMessage("Failed to start timer");
            }
        }),

        commands.registerCommand(STOP_TIMER_COMMAND, async () => {
            try {
                if (!authManager.isLoggedIn) {
                    throw new Error("You must be logged in to stop the timer.");
                }

                await timerService.stop();
                backupController.stop();
            } catch (error: any) {
                window.showErrorMessage(error.message);
            }
        }),

        commands.registerCommand(RESET_TIMER_COMMAND, async () => {
            try {
                if (!authManager.isLoggedIn) {
                    throw new Error("You must be logged in to reset the timer.");
                }

                await timerService.reset();
                backupController.stop();
            } catch (error: any) {
                window.showErrorMessage(error.message);
            }
        }),
    );

    authManager.onDidChangeAuth((isLoggedIn) => {
        if (!isLoggedIn) {
            timerService.stop();
            window.showInformationMessage("You have been logged out. Timer stopped.");
        }
    });
}

export default timerController;
