import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./server";

describe("buildServer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when INTERNAL_API_SECRET is missing", () => {
    vi.stubEnv("INTERNAL_API_SECRET", "");
    expect(() => buildServer()).toThrow("Missing INTERNAL_API_SECRET");
  });

  it("rejects requests without the internal secret header", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-secret");
    const app = buildServer();

    const response = await app.inject({ method: "GET", url: "/internal/health" });

    expect(response.statusCode).toBe(401);
  });

  it("rejects requests with the wrong secret", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-secret");
    const app = buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/internal/health",
      headers: { "x-internal-secret": "wrong" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns ok with the correct secret header, proving DB connectivity", async () => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-secret");
    const app = buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/internal/health",
      headers: { "x-internal-secret": "test-secret" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "api" });
  });
});
