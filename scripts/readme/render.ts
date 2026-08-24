import type {
  Contribution,
  ProfileConfig,
  Project,
  ProjectGroup,
} from "./types.ts";

const MAN_PAGE_WIDTH = 100;

/** Renders the complete GitHub profile README as an HTML-backed man page. */
export function renderReadme(
  config: ProfileConfig,
  groups: ProjectGroup[],
): string {
  const lines = [
    "# Hey 👋",
    "",
    "<pre>",
    "NAME",
    `    ${config.githubOwner} - ${escapeHtml(config.name)}`,
    "",
    "SYNOPSIS",
    `    ${config.githubOwner} [OPTIONS]`,
    "",
    "DESCRIPTION",
    ...wrapText(config.summary, 4),
    "",
    "OPTIONS",
    "    --hey,--hej",
    ...wrapText(
      "Open a chat with send_message(). For best results, try linkedin() " +
        "before email(); packets are friendlier after an introduction.",
      8,
    ),
    "",
    ...groups.flatMap(renderProjectGroup),
    ...renderContributionOption(config.contributions),
    "SUPPORTED EXTENSIONS",
    ...wrapText(config.supportedExtensions.join(", "), 4),
    "",
    "DEPRECATED EXTENSIONS",
    ...wrapText(config.deprecatedExtensions.join(", "), 4),
    "",
    "COMPANY",
    `    ${escapeHtml(config.company)}`,
    "",
    "PREVIOUS COMPANIES",
    ...wrapText(config.previousCompanies.join(", "), 4),
    "",
    "ENVIRONMENT VARIABLES",
    "    LANG",
    "        en_US.utf-8",
    "        uk_UA.utf-8",
    "    HOST",
    `        ${htmlLink("https://goo.gl/maps/sbiJxv6H3PkPdDcy7", "Malmö, Sweden", true)}`,
    "",
    "KNOWN BUGS",
    ...config.knownBugs.flatMap((bug) => wrapText(bug, 4)),
    "",
    "SEE ALSO",
    ...renderSeeAlso(config.seeAlso),
    "</pre>",
    "",
  ];

  return lines.join("\n");
}

/** Renders one repository and all of its discovered projects as an option. */
function renderProjectGroup(group: ProjectGroup): string[] {
  return [
    `    --${escapeHtml(group.flag)}`,
    ...wrapText(group.description, 8),
    ...renderLinkedRows(group.projects),
    "",
  ];
}

/** Renders selected external work with locally curated descriptions. */
function renderContributionOption(contributions: Contribution[]): string[] {
  if (contributions.length === 0) {
    return [];
  }

  const rows = contributions.map((contribution) => ({
    ...contribution,
    suffix: contribution.year ? ` (${contribution.year})` : "",
  }));

  return [
    "    --contributions",
    ...wrapText(
      "Displays open-source projects I have sent a few useful packets to.",
      8,
    ),
    ...renderLinkedRows(rows),
    "",
  ];
}

/** Renders aligned, wrapped rows while measuring the visible link label only. */
function renderLinkedRows(
  projects: Array<Project & { suffix?: string }>,
): string[] {
  const indent = 8;
  const labels = projects.map(
    (project) => `${project.name}${project.suffix ?? ""}`,
  );
  const labelWidth = Math.max(...labels.map((label) => label.length), 1);
  const descriptionWidth = Math.max(
    28,
    MAN_PAGE_WIDTH - indent - labelWidth - 2,
  );

  return projects.flatMap((project, index) => {
    const suffix = project.suffix ?? "";
    const label = labels[index] ?? project.name;
    const padding = " ".repeat(labelWidth - label.length + 2);
    const descriptionLines = wrapWords(project.description, descriptionWidth);
    const firstDescription = descriptionLines.shift() ?? "";
    const firstLine =
      " ".repeat(indent) +
      htmlLink(project.link, project.name) +
      escapeHtml(suffix) +
      padding +
      escapeHtml(firstDescription);
    const continuationIndent = " ".repeat(indent + labelWidth + 2);

    return [
      firstLine,
      ...descriptionLines.map(
        (line) => `${continuationIndent}${escapeHtml(line)}`,
      ),
    ];
  });
}

/** Renders the SEE ALSO links as a compact comma-separated man-page list. */
function renderSeeAlso(projects: Project[]): string[] {
  const links = projects.map((project) =>
    htmlLink(project.link, project.name, true),
  );
  const midpoint = Math.ceil(links.length / 2);

  return [
    `    ${links.slice(0, midpoint).join(", ")},`,
    `    ${links.slice(midpoint).join(", ")}`,
  ];
}

/** Wraps plain text and applies indentation to each resulting line. */
function wrapText(text: string, indent: number): string[] {
  const prefix = " ".repeat(indent);
  return wrapWords(text, MAN_PAGE_WIDTH - indent).map(
    (line) => `${prefix}${escapeHtml(line)}`,
  );
}

/** Wraps words to a visible character width without adding indentation. */
function wrapWords(text: string, width: number): string[] {
  const words = text.trim().split(/\s+/u);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      line = word;
      continue;
    }

    if (line.length + word.length + 1 <= width) {
      line += ` ${word}`;
      continue;
    }

    lines.push(line);
    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

/** Creates a safe HTML anchor suitable for GitHub's supported README subset. */
function htmlLink(link: string, label: string, newTab = false): string {
  const target = newTab ? ' target="_blank"' : "";
  return `<a href="${escapeHtml(link)}"${target}>${escapeHtml(label)}</a>`;
}

/** Escapes text interpolated into the README's HTML block. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
