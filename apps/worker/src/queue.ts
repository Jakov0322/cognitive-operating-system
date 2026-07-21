import PgBoss from "pg-boss";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("Missing DATABASE_URL in environment");
  }

  return url;
}

export function createBoss(): PgBoss {
  return new PgBoss(getDatabaseUrl());
}
