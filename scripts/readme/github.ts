import type {
  GitHubRepository,
  GitTree,
  ProfileConfig,
  Project,
  ProjectGroup,
  RepositoryConfig,
} from "./types.ts";
import {
  collectWorkspacePatterns,
  parsePackageManifest,
  parsePnpmWorkspacePackages,
  selectWorkspaceManifestPaths,
} from "./workspaces.ts";
import { parseSkillManifest, selectSkillManifestPaths } from "./skills.ts";

const GITHUB_API = "https://api.github.com";
const GITHUB_RAW = "https://raw.githubusercontent.com";

interface GitHubClientOptions {
  fetchImplementation?: typeof fetch;
  token?: string;
}

export interface GitHubClient {
  listPublicRepositories(owner: string): Promise<GitHubRepository[]>;
  readRepositoryGroup(
    owner: string,
    repository: GitHubRepository,
    config: RepositoryConfig,
  ): Promise<ProjectGroup>;
}

/** Creates the small GitHub client used by the README discovery pipeline. */
export function createGitHubClient(
  options: GitHubClientOptions = {},
): GitHubClient {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const token = options.token;

  return {
    async listPublicRepositories(owner) {
      const repositories: GitHubRepository[] = [];

      for (let page = 1; ; page += 1) {
        const query = new URLSearchParams({
          direction: "asc",
          page: String(page),
          per_page: "100",
          sort: "full_name",
        });
        const response = await requestJson<unknown>(
          fetchImplementation,
          `${GITHUB_API}/users/${encodeURIComponent(owner)}/repos?${query.toString()}`,
          token,
        );

        if (!Array.isArray(response)) {
          throw new TypeError("GitHub returned an invalid repository list");
        }

        const pageRepositories = response as GitHubRepository[];
        repositories.push(...pageRepositories);
        if (pageRepositories.length < 100) {
          return repositories;
        }
      }
    },

    async readRepositoryGroup(owner, repository, config) {
      if (!config.monorepo) {
        return {
          description: config.description,
          flag: repository.name,
          link: repository.html_url,
          projects: [repositoryToProject(repository)],
        };
      }

      const repositoryApiUrl = [
        GITHUB_API,
        "repos",
        encodeURIComponent(owner),
        encodeURIComponent(repository.name),
      ].join("/");
      const treeUrl =
        `${repositoryApiUrl}/git/trees/` +
        `${encodeURIComponent(repository.default_branch)}?recursive=1`;
      const tree = await requestJson<GitTree>(
        fetchImplementation,
        treeUrl,
        token,
      );
      if (tree.truncated) {
        throw new Error(
          `The recursive tree for ${owner}/${repository.name} was truncated; ` +
            "refusing to publish an incomplete README",
        );
      }

      const repositoryPaths = tree.tree
        .filter((entry) => entry.type === "blob")
        .map((entry) => entry.path);
      const rootManifestPath = repositoryPaths.includes("package.json")
        ? "package.json"
        : undefined;
      const workspacePath = ["pnpm-workspace.yaml", "pnpm-workspace.yml"].find(
        (path) => repositoryPaths.includes(path),
      );
      const [rootManifestSource, workspaceSource] = await Promise.all([
        rootManifestPath
          ? requestRawText(
              fetchImplementation,
              owner,
              repository,
              rootManifestPath,
            )
          : undefined,
        workspacePath
          ? requestRawText(
              fetchImplementation,
              owner,
              repository,
              workspacePath,
            )
          : undefined,
      ]);
      const rootManifest = rootManifestSource
        ? parsePackageManifest(
            rootManifestSource,
            `${repository.name}/package.json`,
          )
        : undefined;

      if (
        workspacePath &&
        workspaceSource &&
        parsePnpmWorkspacePackages(workspaceSource).length === 0
      ) {
        throw new Error(
          `${owner}/${repository.name}/${workspacePath} does not contain a packages list`,
        );
      }

      const workspacePatterns = collectWorkspacePatterns(
        rootManifest,
        workspaceSource,
      );
      const manifestPaths = selectWorkspaceManifestPaths(
        repositoryPaths,
        workspacePatterns,
      );
      const skillManifestPaths = config.skills
        ? selectSkillManifestPaths(repositoryPaths)
        : [];
      const [sources, skillSources] = await Promise.all([
        Promise.all(
          manifestPaths.map(async (manifestPath) => {
            if (manifestPath === rootManifestPath && rootManifestSource) {
              return [manifestPath, rootManifestSource] as const;
            }

            const source = await requestRawText(
              fetchImplementation,
              owner,
              repository,
              manifestPath,
            );
            return [manifestPath, source] as const;
          }),
        ),
        Promise.all(
          skillManifestPaths.map(async (manifestPath) => {
            const source = await requestRawText(
              fetchImplementation,
              owner,
              repository,
              manifestPath,
            );
            return [manifestPath, source] as const;
          }),
        ),
      ]);
      const privatePackageAllowlist = new Set(
        config.privatePackageAllowlist ?? [],
      );
      const projects = [
        ...sources.map(([manifestPath, source]) =>
          packageToProject(
            owner,
            repository,
            manifestPath,
            source,
            privatePackageAllowlist.has(manifestPath),
          ),
        ),
        ...skillSources.map(([manifestPath, source]) =>
          skillToProject(repository, manifestPath, source),
        ),
      ]
        .filter((project): project is Project => project !== undefined)
        .sort((left, right) => left.name.localeCompare(right.name, "en"));

      return {
        description: config.description,
        flag: repository.name,
        link: repository.html_url,
        projects:
          projects.length > 0 ? projects : [repositoryToProject(repository)],
      };
    },
  };
}

/** Discovers active public repositories from the configured allowlist. */
export async function discoverProjectGroups(
  client: GitHubClient,
  config: ProfileConfig,
): Promise<ProjectGroup[]> {
  const repositories = new Map(
    (await client.listPublicRepositories(config.githubOwner))
      .filter(
        (repository) =>
          !repository.private &&
          !repository.archived &&
          !repository.disabled &&
          !repository.fork &&
          repository.name !== config.profileRepository,
      )
      .map((repository) => [repository.name, repository]),
  );

  return Promise.all(
    Object.entries(config.repositories).flatMap(([name, repositoryConfig]) => {
      const repository = repositories.get(name);
      return repository
        ? [
            client.readRepositoryGroup(
              config.githubOwner,
              repository,
              repositoryConfig,
            ),
          ]
        : [];
    }),
  );
}

/** Fetches JSON from GitHub with consistent headers and useful errors. */
async function requestJson<T>(
  fetchImplementation: typeof fetch,
  url: string,
  token: string | undefined,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "zemd-profile-readme",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetchImplementation(url, { headers });
  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const rateLimitHint =
      remaining === "0" ? " (GitHub rate limit reached)" : "";
    throw new Error(
      `GitHub request failed with ${response.status} ` +
        `${response.statusText}${rateLimitHint}: ${url}`,
    );
  }

  return (await response.json()) as T;
}

/** Fetches a public file without spending an authenticated API request. */
async function requestRawText(
  fetchImplementation: typeof fetch,
  owner: string,
  repository: GitHubRepository,
  path: string,
): Promise<string> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = [
    GITHUB_RAW,
    encodeURIComponent(owner),
    encodeURIComponent(repository.name),
    encodeURIComponent(repository.default_branch),
    encodedPath,
  ].join("/");
  const response = await fetchImplementation(url, {
    headers: { "User-Agent": "zemd-profile-readme" },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub raw file request failed with ${response.status} ${response.statusText}: ${url}`,
    );
  }

  return response.text();
}

/** Converts a publishable package manifest into a linked README project. */
function packageToProject(
  owner: string,
  repository: GitHubRepository,
  manifestPath: string,
  source: string,
  allowPrivate: boolean,
): Project | undefined {
  const manifest = parsePackageManifest(
    source,
    `${repository.name}/${manifestPath}`,
  );
  if ((manifest.private === true && !allowPrivate) || !manifest.name?.trim()) {
    return undefined;
  }

  const directory =
    manifestPath === "package.json"
      ? ""
      : manifestPath.slice(0, -"/package.json".length);

  return {
    description:
      manifest.description?.trim() ||
      `A publishable package from ${owner}/${repository.name}.`,
    link: repositoryDirectoryLink(repository, directory),
    name: manifest.name.trim(),
  };
}

/** Converts an Agent Skill manifest into a linked README project. */
function skillToProject(
  repository: GitHubRepository,
  manifestPath: string,
  source: string,
): Project {
  const manifest = parseSkillManifest(
    source,
    `${repository.name}/${manifestPath}`,
  );
  const directory = manifestPath.slice(0, -"/SKILL.md".length);

  return {
    description: manifest.description,
    link: repositoryDirectoryLink(repository, directory),
    name: manifest.name,
  };
}

/** Creates a GitHub link for a repository-relative directory. */
function repositoryDirectoryLink(
  repository: GitHubRepository,
  directory: string,
): string {
  const encodedDirectory = directory
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return encodedDirectory
    ? `${repository.html_url}/tree/` +
        `${encodeURIComponent(repository.default_branch)}/${encodedDirectory}`
    : repository.html_url;
}

/** Falls back to repository metadata when a repository has no public package. */
function repositoryToProject(repository: GitHubRepository): Project {
  return {
    description:
      repository.description?.trim() ||
      "A public project currently between elevator pitches.",
    link: repository.html_url,
    name: repository.name,
  };
}
