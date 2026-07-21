import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export { ANALYSIS_RUN_STATUSES } from "@cognitive-os/shared-types";

// --- Auth.js tables (schema shape required by @auth/drizzle-adapter) ---

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

// --- Domain tables ---

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    repoUrl: text("repo_url").notNull(),
    provider: text("provider").notNull(),
    defaultBranch: text("default_branch"),
    status: text("status").notNull().default("pending"),
    latestRunId: uuid("latest_run_id"),
    lastScannedSha: text("last_scanned_sha"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("projects_owner_repo_unique").on(table.ownerId, table.repoUrl),
  ]
);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    trigger: text("trigger").notNull(),
    commitSha: text("commit_sha"),
    errorStage: text("error_stage"),
    errorMessage: text("error_message"),
    logStorageKey: text("log_storage_key"),
    queuedAt: timestamp("queued_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Enforces single-flight analysis per project at the DB level: only one
    // row per project may be in an active (queued/cloning/running) state.
    uniqueIndex("analysis_runs_one_active_per_project")
      .on(table.projectId)
      .where(sql`${table.status} in ('queued','cloning','running')`),
  ]
);

export const projectProjections = pgTable(
  "project_projections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    data: jsonb("data").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_projections_unique").on(
      table.projectId,
      table.category,
      table.analysisRunId
    ),
    index("project_projections_latest").on(
      table.projectId,
      table.category,
      table.generatedAt
    ),
  ]
);

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  citedCategories: text("cited_categories").array(),
  suggestedNavigation: jsonb("suggested_navigation"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
