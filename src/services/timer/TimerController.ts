import { ExtensionContext, commands, window } from "vscode";
import { AuthService } from "../auth";
import { PreciseTimer, TimerService, TimerView, START_COMMAND, STOP_COMMAND } from "../TimerServices";

async function timerController(ctx: ExtensionContext): Promise<void> {
    // const timer = new PreciseTimer();
    // const service = new TimerService(timer);
    // const view = new TimerView(service);

    view.register(ctx);

    ctx.subscriptions.push(
        commands.registerCommand(START_COMMAND, async () => {

            // auth check before starting the timer
            const isLoggedIn = auth.checkAuth();

            if (isLoggedIn) {
                service.start();
                return;
            }

            window.showInformationMessage("Please log in first");
        }),

        commands.registerCommand(STOP_COMMAND, async () => {
            try {
                await service.stop();
            } catch (error) {
                window.showInformationMessage(error.message);
            }
        }),
    );

    const isLoggedIn = await commands.executeCommand<boolean>("anz.CHECK_AUTH");

    // move it to extension.ts and execute as an command
    if (isLoggedIn) {
        service.start();
        console.log("Timer started automatically");
    } else {
        console.log("User not logged in, timer not started");
    }
}

export default timerController;