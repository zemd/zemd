export interface SkillManifest {
  description: string;
  name: string;
}

/** Selects direct child Agent Skill manifests from the conventional directory. */
export function selectSkillManifestPaths(repositoryPaths: string[]): string[] {
  return repositoryPaths
    .filter((path) => /^skills\/[^/]+\/SKILL\.md$/u.test(path))
    .sort((left, right) => left.localeCompare(right, "en"));
}

/** Reads the required name and description from an Agent Skill manifest. */
export function parseSkillManifest(
  source: string,
  manifestPath: string,
): SkillManifest {
  const lines = source.replace(/^\uFEFF/u, "").split(/\r?\n/u);
  if (lines[0] !== "---") {
    throw new Error(`${manifestPath} does not start with YAML frontmatter`);
  }

  const closingDelimiter = lines.indexOf("---", 1);
  if (closingDelimiter === -1) {
    throw new Error(`${manifestPath} has unterminated YAML frontmatter`);
  }

  const metadata = new Map<string, string>();
  for (const line of lines.slice(1, closingDelimiter)) {
    const match = line.match(/^([a-z][a-z0-9-]*):\s*(.*?)\s*$/u);
    if (!match?.[1] || match[2] === undefined) {
      continue;
    }

    metadata.set(match[1], parseYamlScalar(match[2], manifestPath));
  }

  const name = metadata.get("name")?.trim();
  const description = metadata.get("description")?.trim();
  if (!name || !description) {
    throw new Error(
      `${manifestPath} must define non-empty name and description fields`,
    );
  }

  return { description, name };
}

/** Parses the plain and quoted scalar forms used by Agent Skill metadata. */
function parseYamlScalar(value: string, manifestPath: string): string {
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === "string") {
        return parsed;
      }
    } catch (error) {
      throw new Error(`${manifestPath} has an invalid quoted scalar`, {
        cause: error,
      });
    }

    throw new Error(`${manifestPath} has a non-string quoted scalar`);
  }

  if (value.startsWith("'")) {
    if (!value.endsWith("'")) {
      throw new Error(`${manifestPath} has an invalid quoted scalar`);
    }

    return value.slice(1, -1).replaceAll("''", "'");
  }

  return value;
}
