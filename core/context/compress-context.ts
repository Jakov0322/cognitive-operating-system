import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { rankArtifacts } from "./relevance-engine";
import { CONTEXT_ARTIFACTS } from "./artifact-registry";

function renderCompressedContext(
  task: string,
  ranked: ReturnType<typeof rankArtifacts>
): string {
  const top = ranked.slice(0, 5);

  const lines: string[] = [];

  lines.push("# Compressed Context");
  lines.push("");

  lines.push("## Task");
  lines.push("");
  lines.push(task);
  lines.push("");

  lines.push("## Highest Priority Context");
  lines.push("");

  for (const artifact of top) {
    lines.push(`### ${artifact.title}`);
    lines.push("");
    lines.push(`- Path: \`${artifact.path}\``);
    lines.push(`- Score: ${artifact.relevanceScore}`);
    lines.push(`- Type: ${artifact.type}`);

    if (artifact.matchedModules.length > 0) {
      lines.push(
        `- Relevant modules: ${artifact.matchedModules.join(", ")}`
      );
    }

    if (artifact.matchedKeywords.length > 0) {
      lines.push(
        `- Matched keywords: ${artifact.matchedKeywords.join(", ")}`
      );
    }

    if (artifact.matchedSemanticConcepts.length > 0) {
      lines.push(
        `- Matched concepts: ${artifact.matchedSemanticConcepts.join(", ")}`
      );
    }

    lines.push(`- Why useful: ${artifact.description}`);
    lines.push("");
  }

  lines.push("## Context Loading Strategy");
  lines.push("");
  lines.push("1. Read AGENTS.md first.");
  lines.push("2. Read the highest-ranked context pack.");
  lines.push("3. Read only relevant skills.");
  lines.push("4. Avoid loading unrelated modules.");
  lines.push("");

  lines.push("## Compression Goals");
  lines.push("");
  lines.push("- Minimize token usage.");
  lines.push("- Preserve architectural signal.");
  lines.push("- Avoid redundant context.");
  lines.push("- Prefer high-signal artifacts.");
  lines.push("- Prefer module-local context before global context.");

  return lines.join("\n");
}

async function main() {
  const root = process.cwd();
  const task = process.argv.slice(2).join(" ").trim();

  if (!task) {
    throw new Error(
      'Provide task. Example: npm run context:compress -- "improve hotspot inference"'
    );
  }

  const ranked = rankArtifacts(task, CONTEXT_ARTIFACTS);

  const outputDir = join(root, "outputs", "context-packs");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "compressed-context.md");

  await writeFile(
    outputPath,
    renderCompressedContext(task, ranked),
    "utf8"
  );

  console.log(`Saved compressed context to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});