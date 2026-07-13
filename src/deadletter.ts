export interface DeadLetterRecord {
  id: string;           // event id that gave up
  error: string;        // why the forwarder stopped retrying
  attempts: number;     // how many attempts were made before giving up
  at: Date;
}

export interface DeadLetterAlertOptions {
  threshold?: number;                          // alert after this many records (default 1)
  onAlert: (records: DeadLetterRecord[]) => void;
}

/**
 * Track events that exhausted their retries and alert when they pile up.
 * Bounding retries (see forwarder maxAttempts) traded "hammer forever" for
 * "give up cleanly" -- but a clean give-up nobody sees is silent data loss.
 * Every dead-lettered event must be visible.
 */
export function createDeadLetterLog(opts: DeadLetterAlertOptions): {
  record: (rec: DeadLetterRecord) => void;
  count: () => number;
  records: () => readonly DeadLetterRecord[];
} {
  const { threshold = 1, onAlert } = opts;
  const records: DeadLetterRecord[] = [];
  let alerted = false;

  return {
    record(rec: DeadLetterRecord): void {
      records.push(rec);
      if (!alerted && records.length >= threshold) {
        alerted = true;               // one alert per pile-up, not one per event
        onAlert([...records]);
      }
    },
    count: () => records.length,
    records: () => records,
  };
}
