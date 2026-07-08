import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONTEXT_ARTIFACTS } from "./artifact-registry";
import { rankArtifacts } from "./relevance-engine";
import { outputsDir } from "../shared/workspace";

function renderMarkdown(
  task: string,
  ranked: Awaited<ReturnType<typeof rankArtifacts>>
): string {
  const lines: string[] = [];

  lines.push("# Ranked Context");
  lines.push("");
  lines.push("## Task");
  lines.push("");
  lines.push(task);
  lines.push("");
  lines.push("## Recommended Context");
  lines.push("");

  if (ranked.length === 0) {
    lines.push("- No relevant context found.");
    return lines.join("\n");
  }

  lines.push("| Score | Type | Artifact | Why |");
  lines.push("|---:|---|---|---|");

  for (const artifact of ranked) {
    const why = [
      artifact.matchedModules.length
        ? `modules: ${artifact.matchedModules.join(", ")}`
        : "",
      artifact.matchedKeywords.length
        ? `keywords: ${artifact.matchedKeywords.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("; ");

    lines.push(
      `| ${artifact.relevanceScore} | ${artifact.type} | \`${artifact.path}\` | ${why || "-"} |`
    );
  }

  lines.push("");
  lines.push("## Loading Guidance");
  lines.push("");
  lines.push("- Load the highest-ranked artifact first.");
  lines.push("- Prefer context packs for module-specific work.");
  lines.push("- Prefer skills for cross-cutting architectural guidance.");
  lines.push("- Avoid loading every artifact unless the task is broad.");

  return lines.join("\n");
}

async function main() {
  const task = process.argv.slice(2).join(" ").trim();

  if (!task) {
    throw new Error('Provide task. Example: npm run rank:context -- "refactor github connector"');
  }

  const ranked = await rankArtifacts(task, CONTEXT_ARTIFACTS);

  const outputDir = outputsDir("context-packs");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "ranked-context.md");

  await writeFile(outputPath, renderMarkdown(task, ranked), "utf8");

  console.log(`Ranked artifacts: ${ranked.length}`);
  console.log(`Saved ranked context to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});