import { describe, it, expect } from "vitest";
import { dedupeKey, idempotencyHeader } from "./idempotency.js";

describe("dedupeKey", () => {
  it("is deterministic for the same event", () => {
    const event = { id: "evt_1", payload: { amount: 100, currency: "USD" } };
    expect(dedupeKey(event)).toBe(dedupeKey(event));
  });

  it("is stable under payload key reordering", () => {
    const a = { id: "evt_1", payload: { amount: 100, currency: "USD" } };
    const b = { id: "evt_1", payload: { currency: "USD", amount: 100 } };
    expect(dedupeKey(a)).toBe(dedupeKey(b));
  });

  it("differs for a different event id", () => {
    const payload = { amount: 100, currency: "USD" };
    const a = dedupeKey({ id: "evt_1", payload });
    const b = dedupeKey({ id: "evt_2", payload });
    expect(a).not.toBe(b);
  });

  it("differs when the payload is mutated", () => {
    const a = dedupeKey({ id: "evt_1", payload: { amount: 100 } });
    const b = dedupeKey({ id: "evt_1", payload: { amount: 101 } });
    expect(a).not.toBe(b);
  });

  it("is stable under nested object key reordering", () => {
    const a = { id: "evt_1", payload: { customer: { id: "c_1", name: "Ada" }, amount: 5 } };
    const b = { id: "evt_1", payload: { amount: 5, customer: { name: "Ada", id: "c_1" } } };
    expect(dedupeKey(a)).toBe(dedupeKey(b));
  });

  it("handles unicode payloads deterministically", () => {
    const event = { id: "evt_1", payload: { customer: "Adaeze Ünal", note: "£100 café" } };
    expect(dedupeKey(event)).toBe(dedupeKey(event));
  });

  it("does not collapse arrays regardless of element order", () => {
    const a = dedupeKey({ id: "evt_1", payload: { items: [1, 2, 3] } });
    const b = dedupeKey({ id: "evt_1", payload: { items: [3, 2, 1] } });
    expect(a).not.toBe(b);
  });

  it("treats a missing payload as distinct from an explicit empty object", () => {
    const a = dedupeKey({ id: "evt_1" });
    const b = dedupeKey({ id: "evt_1", payload: {} });
    expect(a).not.toBe(b);
  });

  it("produces an Idempotency-Key header matching dedupeKey", () => {
    const event = { id: "evt_1", payload: { amount: 100 } };
    expect(idempotencyHeader(event)).toEqual({ "Idempotency-Key": dedupeKey(event) });
  });
});
