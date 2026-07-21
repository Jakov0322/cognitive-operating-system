import { afterEach, describe, expect, it, vi } from "vitest";
import { handlePing } from "./ping";

describe("handlePing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the job's message", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await handlePing({ message: "hello" });

    expect(logSpy).toHaveBeenCalledWith("[ping] received: hello");
  });
});
