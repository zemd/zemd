import assert from "node:assert/strict";
import test from "node:test";

import {
  collectWorkspacePatterns,
  matchesWorkspace,
  parsePackageManifest,
  parsePnpmWorkspacePackages,
  selectWorkspaceManifestPaths,
} from "./workspaces.ts";

void test("parses only the top-level pnpm packages list", () => {
  const source = `saveExact: true
packages:
  - packages/*
  - "integrations/**"
  - '!packages/private'

catalog:
  packages:
    nested: 1
`;

  assert.deepEqual(parsePnpmWorkspacePackages(source), [
    "packages/*",
    "integrations/**",
    "!packages/private",
  ]);
});

void test("combines npm and pnpm workspace forms without duplicates", () => {
  assert.deepEqual(
    collectWorkspacePatterns(
      { workspaces: { packages: ["packages/*", "apps/*"] } },
      "packages:\n  - packages/*\n  - integrations/*\n",
    ),
    ["packages/*", "apps/*", "integrations/*"],
  );
});

void test("selects workspace manifests and ignores nested fixtures", () => {
  assert.deepEqual(
    selectWorkspaceManifestPaths(
      [
        "package.json",
        "packages/color/package.json",
        "packages/color/examples/demo/package.json",
        "packages/private/package.json",
        "fixtures/example/package.json",
      ],
      ["packages/*", "!packages/private"],
    ),
    ["package.json", "packages/color/package.json"],
  );
});

void test("supports single-segment and recursive workspace wildcards", () => {
  assert.equal(matchesWorkspace("packages/color", ["packages/*"]), true);
  assert.equal(matchesWorkspace("packages/color/demo", ["packages/*"]), false);
  assert.equal(matchesWorkspace("packages/color/demo", ["packages/**"]), true);
  assert.equal(
    matchesWorkspace("packages/color", ["{packages,integrations}/*"]),
    true,
  );
});

void test("reports the manifest path when JSON is malformed", () => {
  assert.throws(
    () => parsePackageManifest("{", "js/packages/color/package.json"),
    /Cannot parse js\/packages\/color\/package\.json/u,
  );
});
