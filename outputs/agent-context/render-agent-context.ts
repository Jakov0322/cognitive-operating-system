import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function renderAgentsMd(): string {
  return `# AGENTS.md

## Project Intelligence Context

This repository is analyzed by Cognitive Operating System.

The generated context is evidence-backed and derived from:
- local git history
- normalized events
- extracted entities
- extracted relations
- module activity projections
- hotspot inference

## How agents should use this context

Before making changes, inspect the relevant generated skills:

- \`outputs/skills/architecture/SKILL.md\`
- \`outputs/skills/risk-hotspots/SKILL.md\`
- \`outputs/skills/codebase-navigation/SKILL.md\`
- \`outputs/skills/project-timeline/SKILL.md\`
- \`outputs/skills/INDEX.md\`

## Operating rules

- Prefer evidence-backed changes.
- Check hotspot context before editing high-risk modules.
- Preserve architectural boundaries unless explicitly asked to change them.
- Keep connectors, core, knowledge, and outputs conceptually separated.
- Do not put inference logic inside connectors.
- Do not generate final agent-facing context directly from raw events.

## Current project layers

- \`connectors/\`: external and local signal ingestion
- \`core/\`: normalization, extraction, inference, orchestration
- \`knowledge/\`: events, graph, projections, evidence, schemas
- \`outputs/\`: reports, skills, memory, agent-facing context

## Reports

- \`outputs/reports/module-activity.md\`
- \`outputs/reports/hotspots.md\`
- \`outputs/reports/timeline.md\`

## Context Packs
- \`outputs/context-packs/core.md\`
- \`outputs/context-packs/connectors.md\`
- \`outputs/context-packs/knowledge.md\`
- \`outputs/context-packs/outputs.md\`
`;
}

async function main() {
  const root = process.cwd();

  const outputDir = join(root, "outputs", "agent-context");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "AGENTS.md");

  await writeFile(outputPath, renderAgentsMd(), "utf8");

  console.log(`Saved AGENTS.md to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});