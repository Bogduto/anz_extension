import { ExtensionContext, window, workspace } from "vscode";
import { insertOrGetSession } from "../api";
import githubProjectUrl from "../utils/githubReposUrl";
import { getCurrentProject } from "../utils/currentDirectory";
import { TextDocumentChangeEvent } from "vscode";
import { AuthService } from "./AuthService";
import { title } from "../utils/tittle";
import { History } from "./HistoryService";
import path from "path";

export type sessionType = number | null;
export type currentProjectType = string | undefined;


export class SessionManager {
    private session_id: sessionType = null;

    public setSessionId(id: sessionType): void {
        this.session_id = id;
    }

    public get sessionId(): sessionType {
        return this.session_id;
    }
}

export class SessionService {
    constructor(private session: SessionManager, private auth: AuthService) { }

    async getOrCreateSession(): Promise<sessionType> {
        // auth check
        const isLoggedIn = await this.auth.checkAuth();
        if (!isLoggedIn) return null;


        if (!this.session.sessionId) {
            const repoUrl = githubProjectUrl();
            if (!repoUrl) throw new Error("No GitHub repository detected.");

            const userId = await this.auth.getUserId();

            const projectTitle = title(repoUrl);

            const id = await insertOrGetSession(userId, repoUrl, projectTitle);

            this.session.setSessionId(id);
        }
        return this.session.sessionId;
    }

    resetSession(): void {
        this.session.setSessionId(null);
    }
}

export class DirectoryManager {
    private currentDirectory: currentProjectType = getCurrentProject();

    public setCurrentProject(project: currentProjectType): void {
        this.currentDirectory = project;
    }

    public get currentProjectName(): currentProjectType {
        return this.currentDirectory;
    }

    public get isDirectoryChanged(): boolean {
        const direct = getCurrentProject();
        return this.currentDirectory !== direct;
    }
}

export class DirectoryService {
    constructor(private directory: DirectoryManager, private session: SessionService, private auth: AuthService, private history: History) { }

    public readCurrentFile(): void {
        const editor = window.activeTextEditor;
        if (!editor) return;

        const doc = editor.document;
        const relative = workspace.asRelativePath(doc.uri.fsPath);
        const file = relative.split(path.sep).slice(-2).join(path.sep);

        this.history.addFile(file);
        this.history.addLang(doc.languageId);
    }


    public watchFile(event: TextDocumentChangeEvent): void {
        const isLoggedIn = this.auth.checkAuth();
        if (!isLoggedIn) return;

        const editor = window.activeTextEditor;
        if (!editor) return;
        if (event.document.uri.fsPath === editor.document.uri.fsPath) this.readCurrentFile();
    }

    public async watchFolderDirectory(): Promise<void> {
        const isLoggedIn = await this.auth.checkAuth();
        if (!isLoggedIn) return;

        if (this.directory.isDirectoryChanged) {
            this.directory.setCurrentProject(getCurrentProject());
            this.session.resetSession();
            await this.session.getOrCreateSession();
        }
    }
}

export function directoryController(_: ExtensionContext, directoryService: DirectoryService): void {
    // const sessionManager = new SessionManager();
    // const sessionService = new SessionService(sessionManager);

    // const directoryManager = new DirectoryManager();
    // const directoryService = new DirectoryService(directoryManager, sessionService);

    workspace.onDidChangeTextDocument(async (event) => {
        directoryService.watchFile(event);

        try {
            await directoryService.watchFolderDirectory();
        } catch (err) {
            console.error("Error handling directory change:", err);
        }
    });
}