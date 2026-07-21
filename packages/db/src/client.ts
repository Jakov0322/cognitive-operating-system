import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("Missing DATABASE_URL in environment");
  }

  return url;
}

export const pool = new Pool({ connectionString: getDatabaseUrl() });

export const db = drizzle(pool, { schema });
