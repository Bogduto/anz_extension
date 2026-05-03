
function normalizePath(filePath: string): string {
    return filePath
        .replaceAll("\\", "/")
        .replace(/\/+$/, "")
        .toLowerCase();
}

export default normalizePath;