import { readFile } from "node:fs/promises";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { knowledgeDir, latestJsonFile } from "../shared/workspace";
import { readLatestProjectionOrEmpty } from "../shared/read-projection";
import { rankArtifacts } from "../context/relevance-engine";
import { CONTEXT_ARTIFACTS } from "../context/artifact-registry";
import { OwnershipGraph } from "../../knowledge/schemas/ownership-graph";
import { BusFactorRisk } from "../../knowledge/schemas/bus-factor";
import { ExpertiseProfile } from "../../knowledge/schemas/expertise-profile";
import { ArchitecturalInvariant } from "../../knowledge/schemas/architectural-invariant";
import { checkChangeRisk } from "../inference/check-change-risk";

const server = new McpServer({ name: "cognitive-os", version: "0.1.0" });

function jsonContent(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorContent(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function notFoundMessage(projectionLabel: string): string {
  return `No ${projectionLabel} data found for this repository. Run \`cognitive-os analyze\` here first.`;
}

function normalizeModuleId(input: string): string {
  return input.startsWith("module.") ? input : `module.${input}`;
}

async function readLatestProjection<T>(projectionName: string): Promise<T> {
  const dir = knowledgeDir("projections", projectionName);
  const file = await latestJsonFile(dir);
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as T;
}


server.registerTool(
  "rank_context",
  {
    title: "Rank Context",
    description:
      "Ranks generated reports, skills, and context packs by relevance to a task description, combining semantic similarity and keyword/module matching. Use this first to decide what to read before making changes.",
    inputSchema: { task: z.string().describe("Description of the task you're about to work on") },
  },
  async ({ task }) => {
    const ranked = await rankArtifacts(task, CONTEXT_ARTIFACTS);
    return jsonContent(ranked);
  }
);

server.registerTool(
  "get_hotspots",
  {
    title: "Get Hotspots",
    description:
      "Returns the latest inferred hotspot scores per module (change frequency + coupling risk). High scores mean risky areas to change carefully.",
  },
  async () => {
    try {
      return jsonContent(await readLatestProjection("hotspots"));
    } catch {
      return errorContent(notFoundMessage("hotspot"));
    }
  }
);

server.registerTool(
  "get_ownership_graph",
  {
    title: "Get Ownership Graph",
    description:
      "Returns ownership relationships between people and modules. Pass `module` (e.g. \"core\" or \"module.core\") to filter to edges pointing at one module.",
    inputSchema: { module: z.string().optional().describe("Module name to filter by, e.g. \"core\"") },
  },
  async ({ module }) => {
    try {
      const graph = await readLatestProjection<OwnershipGraph>("ownership-graph");

      if (!module) return jsonContent(graph);

      const targetId = normalizeModuleId(module);

      return jsonContent({
        ...graph,
        edges: graph.edges.filter((edge) => edge.to === targetId),
      });
    } catch {
      return errorContent(notFoundMessage("ownership graph"));
    }
  }
);

server.registerTool(
  "get_bus_factor",
  {
    title: "Get Bus Factor",
    description:
      "Returns bus factor risk (ownership concentration) per module. Pass `module` to filter to a single module.",
    inputSchema: { module: z.string().optional().describe("Module name to filter by, e.g. \"core\"") },
  },
  async ({ module }) => {
    try {
      const risks = await readLatestProjection<BusFactorRisk[]>("bus-factor");

      if (!module) return jsonContent(risks);

      const targetId = normalizeModuleId(module);

      return jsonContent(risks.filter((risk) => risk.moduleId === targetId));
    } catch {
      return errorContent(notFoundMessage("bus factor"));
    }
  }
);

server.registerTool(
  "get_architectural_invariants",
  {
    title: "Get Architectural Invariants",
    description:
      "Returns inferred architectural boundaries, ownership rules, and forbidden dependencies between modules.",
  },
  async () => {
    try {
      return jsonContent(await readLatestProjection("architectural-invariants"));
    } catch {
      return errorContent(notFoundMessage("architectural invariants"));
    }
  }
);

server.registerTool(
  "get_architectural_drift",
  {
    title: "Get Architectural Drift",
    description:
      "Returns inferred drift signals: coupling growth, hotspot growth, architecture expansion, ownership fragmentation, boundary erosion.",
  },
  async () => {
    try {
      return jsonContent(await readLatestProjection("architectural-drift"));
    } catch {
      return errorContent(notFoundMessage("architectural drift"));
    }
  }
);

server.registerTool(
  "get_snapshot_trend",
  {
    title: "Get Snapshot Trend",
    description:
      "Returns the full history of repository snapshots (module/hotspot/invariant/event counts over time, plus the growth signals between each consecutive pair), not just the latest-vs-previous diff. Use this to see whether risk is trending up or down across many analyze runs, not just the most recent one.",
  },
  async () => {
    try {
      return jsonContent(await readLatestProjection("snapshot-trend"));
    } catch {
      return errorContent(notFoundMessage("snapshot trend"));
    }
  }
);

server.registerTool(
  "get_expertise",
  {
    title: "Get Expertise",
    description:
      "Returns inferred expertise areas and strongest modules per contributor. Pass `personId` to filter to one contributor.",
    inputSchema: { personId: z.string().optional().describe("Person id, e.g. \"jakovvidovic0-gmail-com\"") },
  },
  async ({ personId }) => {
    try {
      const profiles = await readLatestProjection<ExpertiseProfile[]>("expertise");

      if (!personId) return jsonContent(profiles);

      return jsonContent(profiles.filter((profile) => profile.personId === personId));
    } catch {
      return errorContent(notFoundMessage("expertise"));
    }
  }
);

server.registerTool(
  "check_change_risk",
  {
    title: "Check Change Risk",
    description:
      "Given a list of file paths you're about to change, returns a combined risk report per touched module: hotspot score, bus factor, architectural invariants that apply, and which contributors have the most expertise there. Use this before editing files to decide how careful to be and who to loop in.",
    inputSchema: {
      files: z.array(z.string()).describe("File paths you're about to change, relative to the repository root"),
    },
  },
  async ({ files }) => {
    const [hotspots, busFactorRisks, invariants, expertiseProfiles] = await Promise.all([
      readLatestProjectionOrEmpty<{ moduleId: string; hotspotScore: number; reasons: string[] }>("hotspots"),
      readLatestProjectionOrEmpty<BusFactorRisk>("bus-factor"),
      readLatestProjectionOrEmpty<ArchitecturalInvariant>("architectural-invariants"),
      readLatestProjectionOrEmpty<ExpertiseProfile>("expertise"),
    ]);

    const report = checkChangeRisk(files, {
      hotspots,
      busFactorRisks,
      invariants,
      expertiseProfiles,
    });

    return jsonContent(report);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
