import { matchesGlob } from "node:path";

import type { PackageManifest } from "./types.ts";

/** Parses a package manifest and adds its path to malformed-JSON errors. */
export function parsePackageManifest(
  source: string,
  manifestPath: string,
): PackageManifest {
  try {
    return JSON.parse(source) as PackageManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot parse ${manifestPath}: ${message}`, {
      cause: error,
    });
  }
}

/** Reads the simple top-level `packages` list from a pnpm workspace file. */
export function parsePnpmWorkspacePackages(source: string): string[] {
  const patterns: string[] = [];
  let inPackages = false;

  for (const line of source.split(/\r?\n/u)) {
    if (/^packages:\s*(?:#.*)?$/u.test(line)) {
      inPackages = true;
      continue;
    }

    if (!inPackages) {
      continue;
    }

    if (/^[^\s#]/u.test(line)) {
      break;
    }

    const match = line.match(/^\s+-\s+(.+?)\s*(?:#.*)?$/u);
    if (!match?.[1]) {
      continue;
    }

    patterns.push(stripMatchingQuotes(match[1].trim()));
  }

  return patterns;
}

/** Combines npm-compatible and pnpm workspace patterns without duplicates. */
export function collectWorkspacePatterns(
  rootManifest: PackageManifest | undefined,
  pnpmWorkspaceSource: string | undefined,
): string[] {
  const workspaces = rootManifest?.workspaces;
  const packagePatterns = Array.isArray(workspaces)
    ? workspaces
    : (workspaces?.packages ?? []);
  const pnpmPatterns = pnpmWorkspaceSource
    ? parsePnpmWorkspacePackages(pnpmWorkspaceSource)
    : [];

  return [...new Set([...packagePatterns, ...pnpmPatterns])];
}

/** Selects root and workspace package manifests while ignoring nested fixtures. */
export function selectWorkspaceManifestPaths(
  repositoryPaths: string[],
  workspacePatterns: string[],
): string[] {
  const manifests = repositoryPaths.filter(
    (path) => path === "package.json" || path.endsWith("/package.json"),
  );
  const selected = manifests.filter((manifestPath) => {
    if (manifestPath === "package.json") {
      return true;
    }

    if (workspacePatterns.length === 0) {
      return false;
    }

    const directory = manifestPath.slice(0, -"/package.json".length);
    return matchesWorkspace(directory, workspacePatterns);
  });

  return selected.sort((left, right) => left.localeCompare(right, "en"));
}

/** Applies positive and negative workspace globs to a repository-relative path. */
export function matchesWorkspace(path: string, patterns: string[]): boolean {
  const positive = patterns.filter((pattern) => !pattern.startsWith("!"));
  const negative = patterns
    .filter((pattern) => pattern.startsWith("!"))
    .map((pattern) => pattern.slice(1));

  return (
    positive.some((pattern) => globMatches(path, pattern)) &&
    !negative.some((pattern) => globMatches(path, pattern))
  );
}

/** Converts the workspace glob subset used by npm and pnpm into a regular expression. */
function globMatches(path: string, pattern: string): boolean {
  return matchesGlob(normalizePath(path), normalizePath(pattern));
}

/** Normalizes a repository-relative path or workspace pattern. */
function normalizePath(value: string): string {
  return value.replace(/^\.\//u, "").replace(/\/$/u, "");
}

/** Removes matching single or double quotes from a scalar value. */
function stripMatchingQuotes(value: string): string {
  const first = value.at(0);
  const last = value.at(-1);
  return first === last && (first === '"' || first === "'")
    ? value.slice(1, -1)
    : value;
}
