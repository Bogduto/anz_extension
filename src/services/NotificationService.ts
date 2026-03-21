import { window } from "vscode";

export class Notification {
    static sayHi () {
        window.showInformationMessage("Hi!");
    }

    static dataCollection() {
        // Ask user for consent to collect data
    }

    
    static timerStart() {
        window.showInformationMessage("Running");
    }

    static timerStop() {
        window.showInformationMessage("Stoped");
    }

}