import { profileConfig } from "./config.ts";
import { createGitHubClient, discoverProjectGroups } from "./github.ts";
import { renderReadme } from "./render.ts";

interface GenerateReadmeOptions {
  fetchImplementation?: typeof fetch;
  token?: string;
}

/** Composes GitHub discovery and pure rendering into one generation step. */
export async function generateReadme(
  options: GenerateReadmeOptions = {},
): Promise<string> {
  const client = createGitHubClient(options);
  const groups = await discoverProjectGroups(client, profileConfig);
  return renderReadme(profileConfig, groups);
}
