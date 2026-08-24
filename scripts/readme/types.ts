export interface GitHubRepository {
  archived: boolean;
  default_branch: string;
  description: string | null;
  disabled: boolean;
  fork: boolean;
  html_url: string;
  name: string;
  private: boolean;
}

export interface GitTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
}

export interface GitTree {
  sha: string;
  tree: GitTreeEntry[];
  truncated: boolean;
}

export interface PackageManifest {
  description?: string;
  name?: string;
  private?: boolean;
  workspaces?: string[] | { packages?: string[] };
}

export interface Project {
  description: string;
  link: string;
  name: string;
}

export interface ProjectGroup {
  description: string;
  flag: string;
  projects: Project[];
}

export interface Contribution extends Project {
  year?: number;
}

export interface RepositoryConfig {
  description: string;
  /** Whether to discover public packages from the repository's workspaces. */
  monorepo: boolean;
  /** Private package manifests that should still appear in the README. */
  privatePackageAllowlist?: string[];
  /** Whether to discover direct child Agent Skills from the `skills` directory. */
  skills?: boolean;
}

export interface ProfileConfig {
  company: string;
  contributions: Contribution[];
  deprecatedExtensions: string[];
  githubOwner: string;
  knownBugs: string[];
  name: string;
  previousCompanies: string[];
  profileRepository: string;
  /** Allowlisted repositories keyed by GitHub name in display order. */
  repositories: Record<string, RepositoryConfig>;
  seeAlso: Project[];
  summary: string;
  supportedExtensions: string[];
}
