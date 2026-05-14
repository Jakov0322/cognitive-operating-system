export function shouldIgnoreFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");

  const ignoredExactFiles = new Set([
    ".gitignore",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "README.md",
    "PROJECT_STRUCTURE.md",
    "tsconfig.json",
  ]);

  if (ignoredExactFiles.has(normalized)) {
    return true;
  }

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