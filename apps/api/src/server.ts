import { db } from "@cognitive-os/db";
import type { HealthResponse } from "@cognitive-os/shared-types";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";

function getInternalSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    throw new Error("Missing INTERNAL_API_SECRET in environment");
  }

  return secret;
}

export function buildServer(): FastifyInstance {
  const internalSecret = getInternalSecret();

  const app = Fastify({ logger: true });

  app.addHook("onRequest", async (request, reply) => {
    if (request.headers["x-internal-secret"] !== internalSecret) {
      reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.get("/internal/health", async (): Promise<HealthResponse> => {
    await db.execute(sql`select 1`);

    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
