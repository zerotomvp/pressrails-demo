export interface ForwarderOptions {
  endpoint: string;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;   // give up instead of retrying forever
  jitter?: boolean;
}

export class DownstreamUnavailableError extends Error {
  constructor(readonly attempts: number, readonly lastError: unknown) {
    super(`billing-service unavailable after ${attempts} attempts`);
    this.name = "DownstreamUnavailableError";
  }
}

/**
 * Forward an event to billing-service with bounded exponential backoff and full
 * jitter. Gives up after maxAttempts so a degraded downstream is not hammered.
 */
export async function forward(event: unknown, opts: ForwarderOptions): Promise<void> {
  const { endpoint, baseDelayMs = 200, maxDelayMs = 30_000, maxAttempts = 8, jitter = true } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await push(endpoint, event);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) await sleep(backoff(attempt, baseDelayMs, maxDelayMs, jitter));
    }
  }
  throw new DownstreamUnavailableError(maxAttempts, lastError);
}

/** Exponential backoff capped at maxMs, with optional full jitter: random(0, exp). */
export function backoff(attempt: number, baseMs: number, maxMs: number, jitter: boolean): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return jitter ? Math.random() * exp : exp;
}

async function push(endpoint: string, event: unknown): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`billing-service push failed: ${res.status}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
