import { describe, it, expect } from "vitest";
import {
  HACKATHON_END,
  pad2,
  formatDateInputValue,
  formatTimeInputValue,
  validateEventName,
  parseEventDateTime,
  getRemaining,
} from "./script.js";

describe("pad2", () => {
  it("left-pads single digits", () => {
    expect(pad2(3)).toBe("03");
  });

  it("leaves two-digit numbers untouched", () => {
    expect(pad2(42)).toBe("42");
  });
});

describe("validateEventName", () => {
  it("rejects an empty name", () => {
    expect(validateEventName("")).toMatch(/name/i);
  });

  it("rejects a whitespace-only name", () => {
    expect(validateEventName("   ")).toMatch(/name/i);
  });

  it("accepts a real name", () => {
    expect(validateEventName("Hackathon ends")).toBeNull();
  });
});

describe("parseEventDateTime", () => {
  it("defaults to midnight local time when no time is given", () => {
    const { date, error } = parseEventDateTime("2026-07-10", "");
    expect(error).toBeUndefined();
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(10);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });

  it("uses the given time when present", () => {
    const { date, error } = parseEventDateTime("2026-07-10", "17:00");
    expect(error).toBeUndefined();
    expect(date.getHours()).toBe(17);
    expect(date.getMinutes()).toBe(0);
  });

  it("warns when the date is blank", () => {
    const { error, date } = parseEventDateTime("", "");
    expect(date).toBeUndefined();
    expect(error).toMatch(/date/i);
  });

  it("warns on a malformed date string", () => {
    const { error } = parseEventDateTime("not-a-date", "");
    expect(error).toMatch(/date/i);
  });

  it("warns on a calendar date that doesn't exist", () => {
    const { error } = parseEventDateTime("2026-02-30", "");
    expect(error).toMatch(/date/i);
  });

  it("warns on a malformed time string", () => {
    const { error } = parseEventDateTime("2026-07-10", "not-a-time");
    expect(error).toMatch(/time/i);
  });

  it("warns on an out-of-range time", () => {
    const { error } = parseEventDateTime("2026-07-10", "25:99");
    expect(error).toMatch(/time/i);
  });

  it("warns when the date would overflow the timer's precision", () => {
    const { error } = parseEventDateTime("275761-01-01", "");
    expect(error).toMatch(/too far/i);
  });
});

describe("getRemaining", () => {
  it("computes days/hours/minutes/seconds from a future target", () => {
    const now = new Date(2026, 0, 1, 0, 0, 0).getTime();
    // 2 days, 3 hours, 4 minutes, 5 seconds ahead of `now`.
    const targetMs = now + ((2 * 24 + 3) * 60 * 60 + 4 * 60 + 5) * 1000;

    const remaining = getRemaining(targetMs, now);
    expect(remaining).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      reached: false,
    });
  });

  it("borrows correctly across unit boundaries", () => {
    const now = new Date(2026, 0, 1, 0, 0, 0).getTime();
    // Exactly 1 second short of a full day: 23h 59m 59s remaining.
    const targetMs = now + (24 * 60 * 60 - 1) * 1000;

    const remaining = getRemaining(targetMs, now);
    expect(remaining).toEqual({
      days: 0,
      hours: 23,
      minutes: 59,
      seconds: 59,
      reached: false,
    });
  });

  it("clamps at zero and reports reached once the target has passed", () => {
    const now = new Date(2026, 0, 1, 0, 0, 0).getTime();
    const remaining = getRemaining(now - 1000, now);
    expect(remaining).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      reached: true,
    });
  });

  it("treats the exact target instant as reached", () => {
    const now = new Date(2026, 0, 1, 0, 0, 0).getTime();
    const remaining = getRemaining(now, now);
    expect(remaining.reached).toBe(true);
  });
});

describe("hackathon default event", () => {
  it("targets 2026-07-10 21:00 UTC (17:00 EDT)", () => {
    expect(HACKATHON_END.toISOString()).toBe("2026-07-10T21:00:00.000Z");
  });

  it("round-trips through the local date/time inputs back to the same instant", () => {
    const dateStr = formatDateInputValue(HACKATHON_END);
    const timeStr = formatTimeInputValue(HACKATHON_END);
    const { date, error } = parseEventDateTime(dateStr, timeStr);
    expect(error).toBeUndefined();
    expect(date.getTime()).toBe(HACKATHON_END.getTime());
  });
});
