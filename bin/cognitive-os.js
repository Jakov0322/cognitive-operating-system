#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const COMMANDS = {
  analyze: path.join(__dirname, "..", "core", "orchestration", "run-analysis.ts"),
  mcp: path.join(__dirname, "..", "core", "mcp", "server.ts"),
};

const command = process.argv[2];

if (!command || !COMMANDS[command]) {
  console.error(
    "Usage: cognitive-os <command>\n\nCommands:\n  analyze   Run the full analysis pipeline against the current repository\n  mcp       Start the MCP server (stdio) exposing generated context to AI agents\n"
  );
  process.exit(1);
}

const tsxCli = require.resolve("tsx/cli");

const result = spawnSync(
  process.execPath,
  [tsxCli, COMMANDS[command], ...process.argv.slice(3)],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
