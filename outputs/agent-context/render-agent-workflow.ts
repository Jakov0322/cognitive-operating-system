import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { outputsDir } from "../../core/shared/workspace";

function renderWorkflow(): string {
  return `# Agent Workflow

## Purpose

This workflow describes how an AI agent should use generated project context before modifying the repository.

## Standard Flow

1. Run project analysis:

\`\`\`bash
npm run analyze
\`\`\`

2. Prepare task-specific context:

\`\`\`bash
npm run context:prepare -- "<task description>"
\`\`\`

3. Read context in this order:

- \`outputs/context-packs/compressed-context.md\`
- \`outputs/context-packs/task-context.md\`
- \`outputs/context-packs/ranked-context.md\`
- relevant \`outputs/skills/*/SKILL.md\`

4. Make the smallest safe change.

5. Regenerate analysis:

\`\`\`bash
npm run analyze
\`\`\`

6. Inspect regenerated reports and skills.

## Context Discipline

- Prefer compressed context over reading everything.
- Load module context packs only when the task touches that module.
- Do not manually edit generated outputs unless explicitly instructed.
- Modify source pipeline code and regenerate outputs.
- Preserve evidence-backed reasoning.

## When to Use Each Command

| Command | Use |
|---|---|
| \`npm run analyze\` | regenerate project intelligence |
| \`npm run context:prepare -- "<task>"\` | generate task-specific context |
| \`npm run rank:context -- "<task>"\` | inspect ranking only |
| \`npm run context:compress -- "<task>"\` | generate compressed context only |
| \`npm run context:task -- "<task>"\` | generate task context pack only |

## Agent Rule

Never start a non-trivial code change without preparing context first.
`;
}

async function main() {
  const outputDir = outputsDir("agent-context");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "WORKFLOW.md");

  await writeFile(outputPath, renderWorkflow(), "utf8");

  console.log(`Saved agent workflow to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});