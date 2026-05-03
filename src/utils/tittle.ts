// return repository name from repository url
export const titleFromPathname = (reposUrl: string) => reposUrl?.split('/').pop()?.replace('.git', '') ?? "Unknown";