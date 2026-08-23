import assert from "node:assert/strict";
import test from "node:test";

import { profileConfig } from "./config.ts";
import {
  createGitHubClient,
  discoverProjectGroups,
  type GitHubClient,
} from "./github.ts";
import type { GitHubRepository, RepositoryConfig } from "./types.ts";

const repository: GitHubRepository = {
  archived: false,
  default_branch: "main",
  description: "A test monorepo",
  disabled: false,
  fork: false,
  html_url: "https://github.com/zemd/example",
  name: "example",
  private: false,
};

const monorepoConfig: RepositoryConfig = {
  description: "Displays examples.",
  monorepo: true,
};

void test("discovers public and allowlisted private workspace packages", async () => {
  const responses = new Map<string, string | object>([
    [
      "https://api.github.com/repos/zemd/example/git/trees/main?recursive=1",
      {
        sha: "tree-sha",
        tree: [
          { path: "package.json", type: "blob" },
          { path: "pnpm-workspace.yaml", type: "blob" },
          { path: "packages/public/package.json", type: "blob" },
          { path: "packages/private/package.json", type: "blob" },
          { path: "vscode/theme-onyx/package.json", type: "blob" },
          { path: "packages/public/example/package.json", type: "blob" },
        ],
        truncated: false,
      },
    ],
    [
      "https://raw.githubusercontent.com/zemd/example/main/package.json",
      JSON.stringify({ name: "example-root", private: true }),
    ],
    [
      "https://raw.githubusercontent.com/zemd/example/main/pnpm-workspace.yaml",
      "packages:\n  - packages/*\n  - vscode/*\n",
    ],
    [
      "https://raw.githubusercontent.com/zemd/example/main/packages/public/package.json",
      JSON.stringify({ name: "@zemd/public", description: "Public package" }),
    ],
    [
      "https://raw.githubusercontent.com/zemd/example/main/packages/private/package.json",
      JSON.stringify({ name: "@zemd/private", private: true }),
    ],
    [
      "https://raw.githubusercontent.com/zemd/example/main/vscode/theme-onyx/package.json",
      JSON.stringify({
        name: "zemd-theme-dark",
        private: true,
        description: "A Visual Studio Code theme for effective work",
      }),
    ],
  ]);
  const fetchImplementation = createFixtureFetch(responses);
  const client = createGitHubClient({ fetchImplementation });
  const group = await client.readRepositoryGroup("zemd", repository, {
    ...monorepoConfig,
    privatePackageAllowlist: ["vscode/theme-onyx/package.json"],
  });

  assert.deepEqual(group, {
    description: "Displays examples.",
    flag: "example",
    projects: [
      {
        description: "Public package",
        link: "https://github.com/zemd/example/tree/main/packages/public",
        name: "@zemd/public",
      },
      {
        description: "A Visual Studio Code theme for effective work",
        link: "https://github.com/zemd/example/tree/main/vscode/theme-onyx",
        name: "zemd-theme-dark",
      },
    ],
  });
});

void test("falls back to repository metadata when no package is publishable", async () => {
  const fetchImplementation = createFixtureFetch(
    new Map([
      [
        "https://api.github.com/repos/zemd/example/git/trees/main?recursive=1",
        { sha: "tree-sha", tree: [], truncated: false },
      ],
    ]),
  );
  const client = createGitHubClient({ fetchImplementation });
  const group = await client.readRepositoryGroup(
    "zemd",
    repository,
    monorepoConfig,
  );

  assert.deepEqual(group.projects, [
    {
      description: "A test monorepo",
      link: "https://github.com/zemd/example",
      name: "example",
    },
  ]);
});

void test("uses configured repositories as an ordered allowlist", async () => {
  const requestedRepositories: string[] = [];
  const client: GitHubClient = {
    async listPublicRepositories() {
      return [
        { ...repository, name: "unlisted" },
        { ...repository, name: "tooling" },
        { ...repository, name: "js" },
        { ...repository, archived: true, name: "web" },
      ];
    },
    async readRepositoryGroup(_owner, listedRepository, config) {
      requestedRepositories.push(listedRepository.name);
      return {
        description: config.description,
        flag: listedRepository.name,
        projects: [],
      };
    },
  };

  const groups = await discoverProjectGroups(client, profileConfig);

  assert.deepEqual(
    Object.entries(profileConfig.repositories).map(([name, config]) => [
      name,
      config.monorepo,
    ]),
    [
      ["js", true],
      ["react", true],
      ["web", true],
      ["tooling", true],
    ],
  );
  assert.deepEqual(requestedRepositories, ["js", "tooling"]);
  assert.deepEqual(
    groups.map((group) => group.flag),
    ["js", "tooling"],
  );
});

void test("does not inspect package trees for a single-package repository", async () => {
  const client = createGitHubClient({
    fetchImplementation: (() => {
      throw new Error("single-package repositories should not be fetched");
    }) as typeof fetch,
  });

  const group = await client.readRepositoryGroup("zemd", repository, {
    description: "Displays one example.",
    monorepo: false,
  });

  assert.deepEqual(group, {
    description: "Displays one example.",
    flag: "example",
    projects: [
      {
        description: "A test monorepo",
        link: "https://github.com/zemd/example",
        name: "example",
      },
    ],
  });
});

/** Creates a fetch implementation backed by URL-keyed fixture responses. */
function createFixtureFetch(
  responses: Map<string, string | object>,
): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    const body = responses.get(url);
    if (body === undefined) {
      return new Response("Not found", {
        status: 404,
        statusText: "Not Found",
      });
    }

    return typeof body === "string" ? new Response(body) : Response.json(body);
  }) as typeof fetch;
}
