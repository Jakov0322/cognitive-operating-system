export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").trim();
}

export function isGitKeepFile(filePath: string): boolean {
  return normalizePath(filePath).endsWith(".gitkeep");
}

export function isRootConfigFile(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  const rootConfigFiles = new Set([
    ".gitignore",
    ".env",
    ".env.example",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "README.md",
    "PROJECT_STRUCTURE.md",
    "tsconfig.json",
  ]);

  return rootConfigFiles.has(normalized);
}

export function isGeneratedOrVendorPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  const ignoredPrefixes = [
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    ".next/",
    ".git/",
  ];

  return ignoredPrefixes.some((prefix) => normalized.startsWith(prefix));
}

export function shouldIgnoreForModuleInference(filePath: string): boolean {
  return (
    isRootConfigFile(filePath) ||
    isGeneratedOrVendorPath(filePath) ||
    isGitKeepFile(filePath)
  );
}

export function shouldIgnoreForChangeWeight(filePath: string): boolean {
  return (
    isGeneratedOrVendorPath(filePath) ||
    isGitKeepFile(filePath)
  );
}