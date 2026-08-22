import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { generateReadme } from "./generate.ts";

const readmePath = fileURLToPath(new URL("../../README.md", import.meta.url));

interface Arguments {
  check: boolean;
  help: boolean;
  stdout: boolean;
}

/** Parses the deliberately small command-line interface. */
function parseArguments(arguments_: string[]): Arguments {
  const supported = new Set(["--check", "--help", "--stdout"]);
  const unknown = arguments_.filter((argument) => !supported.has(argument));
  if (unknown.length > 0) {
    throw new Error(`Unknown option: ${unknown.join(", ")}`);
  }

  return {
    check: arguments_.includes("--check"),
    help: arguments_.includes("--help"),
    stdout: arguments_.includes("--stdout"),
  };
}

/** Runs README generation in write, check, or preview mode. */
async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.help) {
    console.log(
      "Usage: pnpm build:readme [--check|--stdout]\n\n" +
        "  --check   fail when README.md is stale\n" +
        "  --stdout  print the generated README without writing it",
    );
    return;
  }

  if (arguments_.check && arguments_.stdout) {
    throw new Error("Use either --check or --stdout, not both");
  }

  const token = process.env["GITHUB_TOKEN"];
  const generated = await generateReadme(token ? { token } : {});
  if (arguments_.stdout) {
    process.stdout.write(generated);
    return;
  }

  if (arguments_.check) {
    const current = await readFile(readmePath, "utf8");
    if (current !== generated) {
      throw new Error("README.md is stale; run `pnpm build:readme`");
    }
    console.log("README.md is current");
    return;
  }

  await writeFile(readmePath, generated, "utf8");
  console.log("Updated README.md");
}

await main();
