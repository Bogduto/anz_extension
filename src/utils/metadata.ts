import githubProjectUrl from "./githubReposUrl";
import { titleFromPathname } from "./tittle";

export function workspaceMetadata() {
    const href = githubProjectUrl();

    if (!href) throw new Error("Repository does not exist");

    const name = titleFromPathname(href);

    return {
        href,
        name,
    }
}