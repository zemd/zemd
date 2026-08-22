import type { ProfileConfig } from "./types.ts";

export const profileConfig: ProfileConfig = {
  company: "IKEA IT AB",
  contributions: [
    {
      description: "implemented `ReplicatedMap` and `Semaphore` support.",
      link: "https://github.com/hazelcast/hazelcast-nodejs-client/commits/master/?author=zemd",
      name: "hazelcast-client",
      year: 2017,
    },
  ],
  deprecatedExtensions: ["*.java", "*.php", "*.rb"],
  githubOwner: "zemd",
  knownBugs: [
    "Cold email may return ECONNREFUSED. This is probably a feature.",
  ],
  name: "Dmytro Zelenetskyi",
  previousCompanies: [
    "Gopuff",
    "Edgio",
    "Waverley Software",
    "Cprime",
    "DataArt",
  ],
  profileRepository: "zemd",
  repositories: {
    js: {
      description:
        "JavaScript and TypeScript projects. Small modules, deliberate APIs, and opinions tested in production.",
      monorepo: true,
    },
    react: {
      description: "React projects built around deliberate composition.",
      monorepo: true,
    },
    web: {
      description:
        "CSS, fonts, and browser-ready foundations. Because browser defaults have strong opinions too.",
      monorepo: true,
    },
    tooling: {
      description:
        "Shared developer tooling with predictable defaults for humans.",
      monorepo: true,
    },
  },
  seeAlso: [
    { description: "blog(4)", link: "https://okro.sh/gc", name: "blog(4)" },
    {
      description: "linkedin(4)",
      link: "https://okro.sh/gl",
      name: "linkedin(4)",
    },
    {
      description: "onlyfans(6)",
      link: "https://okro.sh/gofs",
      name: "onlyfans(6)",
    },
    {
      description: "codewars(4)",
      link: "https://okro.sh/gcws",
      name: "codewars(4)",
    },
  ],
  summary:
    "A father, husband, software expert, and technology enthusiast with over " +
    "ten years in the field. Still eager to learn new things, take on new " +
    "challenges, and occasionally discover exciting new ways to misunderstand " +
    "a specification.",
  supportedExtensions: [
    "*.sh",
    "*.js",
    "*.ts",
    "*.tsx",
    "*.mjs",
    "*.cjs",
    "*.go",
    "*.rs",
  ],
};
