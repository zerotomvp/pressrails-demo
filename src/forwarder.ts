export interface ForwarderOptions {
  endpoint: string;      // billing-service ingest URL
  intervalMs?: number;   // fixed retry interval
}

/**
 * Forward an event to billing-service, retrying on failure.
 * Retries FOREVER at a fixed interval until the push succeeds.
 */
export async function forward(event: unknown, opts: ForwarderOptions): Promise<void> {
  const { endpoint, intervalMs = 1000 } = opts;
  while (true) {                        // no cap, no backoff
    try {
      await push(endpoint, event);
      return;
    } catch {
      await sleep(intervalMs);          // fixed 1s, hammers a degraded downstream
    }
  }
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
