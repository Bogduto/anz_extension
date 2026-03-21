import createSetStore, { CreateSetStoreProps } from "../utils/createSetStore";

export class History {
    private filesHistory: CreateSetStoreProps<string> = createSetStore();
    private langsHistory: CreateSetStoreProps<string> = createSetStore();

    public get files(): Set<string> {
        return this.filesHistory.get();
    }

    public get langs(): Set<string> {
        return this.langsHistory.get();
    }

    public addFile(file: string): void {
        this.filesHistory.add(file);
    }

    public addLang(lang: string): void {
        this.langsHistory.add(lang);
    }

    public clearFiles(): void {
        this.filesHistory.clear();
    }

    public clearLangs(): void {
        this.langsHistory.clear();
    }

    public clearAll(): void {
        this.clearFiles();
        this.clearLangs();
    }
}
