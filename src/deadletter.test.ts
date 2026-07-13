import { describe, expect, it, vi } from "vitest";
import { createDeadLetterLog, type DeadLetterRecord } from "./deadletter.js";

const rec = (id: string, attempts = 5): DeadLetterRecord => ({
  id,
  error: "DownstreamUnavailableError: billing-service push failed",
  attempts,
  at: new Date("2026-07-13T14:00:00Z"),
});

describe("createDeadLetterLog", () => {
  it("records dead-lettered events and counts them", () => {
    const log = createDeadLetterLog({ onAlert: () => {} });
    log.record(rec("evt-1"));
    log.record(rec("evt-2"));
    expect(log.count()).toBe(2);
    expect(log.records().map((r) => r.id)).toEqual(["evt-1", "evt-2"]);
  });

  it("alerts on the first record by default", () => {
    const onAlert = vi.fn();
    const log = createDeadLetterLog({ onAlert });
    log.record(rec("evt-1"));
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert.mock.calls[0][0]).toHaveLength(1);
  });

  it("waits for the threshold before alerting", () => {
    const onAlert = vi.fn();
    const log = createDeadLetterLog({ threshold: 3, onAlert });
    log.record(rec("evt-1"));
    log.record(rec("evt-2"));
    expect(onAlert).not.toHaveBeenCalled();
    log.record(rec("evt-3"));
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert.mock.calls[0][0].map((r: DeadLetterRecord) => r.id)).toEqual(["evt-1", "evt-2", "evt-3"]);
  });

  it("alerts once per pile-up, not once per event", () => {
    const onAlert = vi.fn();
    const log = createDeadLetterLog({ onAlert });
    log.record(rec("evt-1"));
    log.record(rec("evt-2"));
    log.record(rec("evt-3"));
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(log.count()).toBe(3);
  });

  it("keeps the record details (attempts + error) for the alert payload", () => {
    const onAlert = vi.fn();
    const log = createDeadLetterLog({ onAlert });
    log.record(rec("evt-9", 7));
    const [records] = onAlert.mock.calls[0];
    expect(records[0]).toMatchObject({ id: "evt-9", attempts: 7 });
    expect(records[0].error).toContain("DownstreamUnavailableError");
  });
});
