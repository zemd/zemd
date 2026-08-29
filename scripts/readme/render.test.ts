import assert from "node:assert/strict";
import test from "node:test";

import { profileConfig } from "./config.ts";
import { renderReadme } from "./render.ts";

void test("renders repository packages, contributions, and retained profile sections", () => {
  const readme = renderReadme(profileConfig, [
    {
      description: "Displays JavaScript projects with a sense of humor.",
      flag: "js",
      link: "https://github.com/zemd/js",
      projects: [
        {
          description: "Typed color utilities",
          link: "https://github.com/zemd/js/tree/main/packages/color",
          name: "@zemd/color",
        },
        {
          description: "Escapes <unexpected> input & keeps going",
          link: "https://github.com/zemd/js/tree/main/packages/std",
          name: "@zemd/std-modules",
        },
      ],
    },
  ]);

  assert.match(readme, /^# Hey 👋\n\n<pre>\nNAME/u);
  assert.match(
    readme,
    /    --<a href="https:\/\/github\.com\/zemd\/js">js<\/a>\n/u,
  );
  assert.match(
    readme,
    /<a href="https:\/\/github\.com\/zemd\/js\/tree\/main\/packages\/color">@zemd\/color<\/a>/u,
  );
  assert.match(readme, /Escapes &lt;unexpected&gt; input &amp; keeps going/u);
  assert.match(readme, /    --contributions\n/u);
  assert.match(readme, /implemented `ReplicatedMap` and `Semaphore`/u);
  assert.match(readme, /SUPPORTED EXTENSIONS/u);
  assert.match(readme, /PREVIOUS COMPANIES/u);
  assert.match(readme, /ENVIRONMENT VARIABLES/u);
  assert.match(readme, /KNOWN BUGS/u);
  assert.doesNotMatch(readme, /NOTES/u);
  assert.match(readme, /SEE ALSO/u);
  assert.match(
    readme,
    /<a href="https:\/\/okro\.sh\/gnpm" target="_blank">npm\(4\)<\/a>/u,
  );
  assert.doesNotMatch(readme, /codewars/iu);
  assert.match(readme, /<\/pre>\n$/u);
});
