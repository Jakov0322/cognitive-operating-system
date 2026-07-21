import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  accounts,
  analysisRuns,
  chatMessages,
  chatSessions,
  projectProjections,
  projects,
  sessions,
  users,
  verificationTokens,
} from "./schema";

describe("Auth.js table shape", () => {
  // @auth/drizzle-adapter's default schema expects these exact table names.
  // A rename here would silently break login at runtime with no type error,
  // since the adapter matches tables/columns by string, not by import identity.
  it("names the Auth.js tables exactly as the adapter expects", () => {
    expect(getTableName(users)).toBe("user");
    expect(getTableName(accounts)).toBe("account");
    expect(getTableName(sessions)).toBe("session");
    expect(getTableName(verificationTokens)).toBe("verificationToken");
  });
});

describe("domain table shape", () => {
  it("names every domain table as expected by the schema design", () => {
    expect(getTableName(projects)).toBe("projects");
    expect(getTableName(analysisRuns)).toBe("analysis_runs");
    expect(getTableName(projectProjections)).toBe("project_projections");
    expect(getTableName(chatSessions)).toBe("chat_sessions");
    expect(getTableName(chatMessages)).toBe("chat_messages");
  });
});
