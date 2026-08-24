import assert from "node:assert/strict";
import test from "node:test";

import { parseSkillManifest, selectSkillManifestPaths } from "./skills.ts";

void test("selects direct child skill manifests", () => {
  assert.deepEqual(
    selectSkillManifestPaths([
      "skills/palette/references/example/SKILL.md",
      "skills/palette/SKILL.md",
      "packages/color/SKILL.md",
      "skills/contrast/SKILL.md",
    ]),
    ["skills/contrast/SKILL.md", "skills/palette/SKILL.md"],
  );
});

void test("parses required skill frontmatter", () => {
  assert.deepEqual(
    parseSkillManifest(
      `---
name: calculate-colors
description: "Calculate colors: without guessing."
---

# Calculate Colors
`,
      "ai/skills/calculate-colors/SKILL.md",
    ),
    {
      description: "Calculate colors: without guessing.",
      name: "calculate-colors",
    },
  );
});

void test("reports invalid skill metadata with its path", () => {
  assert.throws(
    () =>
      parseSkillManifest(
        "---\nname: calculate-colors\n---\n",
        "ai/skills/calculate-colors/SKILL.md",
      ),
    /ai\/skills\/calculate-colors\/SKILL\.md must define non-empty name and description/u,
  );
});
