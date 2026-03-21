import { extensions } from "vscode";

const githubProjectUrl = () => {
  const gitExt = extensions.getExtension('vscode.git')?.exports;
  const git = gitExt?.getAPI(1);
  const repo = git?.repositories[0];
  return repo?.state.remotes[0]?.fetchUrl ?? null;
};

export default githubProjectUrl;