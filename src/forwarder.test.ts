import { describe, it, expect, vi, afterEach } from "vitest";
import { backoff, forward, DownstreamUnavailableError } from "./forwarder.js";

describe("backoff", () => {
  it("grows exponentially without jitter", () => {
    expect(backoff(0, 200, 30_000, false)).toBe(200);
    expect(backoff(1, 200, 30_000, false)).toBe(400);
    expect(backoff(3, 200, 30_000, false)).toBe(1_600);
  });
  it("caps at maxDelayMs", () => {
    expect(backoff(20, 200, 30_000, false)).toBe(30_000);
  });
  it("with jitter stays within [0, exp]", () => {
    for (let i = 0; i < 200; i++) {
      const d = backoff(4, 200, 30_000, true);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(3_200);
    }
  });
});

describe("forward", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("returns on first success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    await expect(forward({ id: 1 }, { endpoint: "x", baseDelayMs: 0 })).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("gives up after maxAttempts with DownstreamUnavailableError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    await expect(
      forward({ id: 1 }, { endpoint: "x", baseDelayMs: 0, maxAttempts: 4 }),
    ).rejects.toBeInstanceOf(DownstreamUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
