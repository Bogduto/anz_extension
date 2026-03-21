// return repository name from repository url
export const title = (reposUrl: string) => reposUrl?.split('/').pop()?.replace('.git', '') ?? "Unknown";