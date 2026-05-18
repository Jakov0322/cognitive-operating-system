import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

function renderSkillIndex(): string {
  return `# Skill Index

## Purpose

Use this index to decide which generated skill should be loaded for a task.

## Available Skills

### Onboarding

Path:

\`outputs/skills/onboarding/SKILL.md\`

Use when:
- starting work in this repository
- onboarding a new agent or developer
- needing a quick project mental model

---

### Architecture

Path:

\`outputs/skills/architecture/SKILL.md\`

Use when:
- changing module boundaries
- introducing new layers
- modifying dependency direction
- touching \`core/\`, \`knowledge/\`, or orchestration logic

---

### Codebase Navigation

Path:

\`outputs/skills/codebase-navigation/SKILL.md\`

Use when:
- deciding where new files should live
- moving files
- adding new modules
- understanding top-level project structure

---

### Risk Hotspots

Path:

\`outputs/skills/risk-hotspots/SKILL.md\`

Use when:
- editing high-risk modules
- planning refactors
- touching modules with high activity or coupling
- checking architectural volatility

---

### Project Timeline

Path:

\`outputs/skills/project-timeline/SKILL.md\`

Use when:
- reasoning about project evolution
- distinguishing scaffold from real evolution
- checking historical phases
- explaining why current structure exists

## Agent Loading Rule

Before editing code, load:

1. \`outputs/agent-context/AGENTS.md\`
2. this skill index
3. the task-specific skill

Prefer the narrowest relevant skill over reading every file.
`;
}

async function main() {
  const root = process.cwd();

  const outputDir = join(root, "outputs", "skills");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "INDEX.md");

  await writeFile(outputPath, renderSkillIndex(), "utf8");

  console.log(`Saved skill index to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});