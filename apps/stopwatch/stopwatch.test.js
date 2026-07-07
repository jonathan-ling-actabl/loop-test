import { describe, it, expect } from "vitest";
import {
  pad2,
  createState,
  elapsedMs,
  start,
  stop,
  reset,
  formatElapsed,
  recordLap,
  clearLaps,
} from "./script.js";

describe("pad2", () => {
  it("left-pads single digits", () => {
    expect(pad2(7)).toBe("07");
  });

  it("leaves two-digit numbers untouched", () => {
    expect(pad2(42)).toBe("42");
  });
});

describe("formatElapsed", () => {
  it("formats zero as all-padded HH:MM:SS.cs", () => {
    expect(formatElapsed(0)).toBe("00:00:00.00");
  });

  it("formats sub-second durations as centiseconds", () => {
    expect(formatElapsed(120)).toBe("00:00:00.12");
    expect(formatElapsed(990)).toBe("00:00:00.99");
  });

  it("truncates centiseconds rather than rounding up", () => {
    // 129 ms is 12.9 centiseconds; must display 12, never 13.
    expect(formatElapsed(129)).toBe("00:00:00.12");
  });

  it("formats the one-second boundary", () => {
    expect(formatElapsed(1000)).toBe("00:00:01.00");
  });

  it("formats the one-minute boundary", () => {
    expect(formatElapsed(60 * 1000)).toBe("00:01:00.00");
  });

  it("formats the one-hour boundary", () => {
    expect(formatElapsed(60 * 60 * 1000)).toBe("01:00:00.00");
  });

  it("formats a mixed duration", () => {
    const ms = (2 * 3600 + 3 * 60 + 4) * 1000 + 50;
    expect(formatElapsed(ms)).toBe("02:03:04.05");
  });

  it("clamps negative input to zero", () => {
    expect(formatElapsed(-500)).toBe("00:00:00.00");
  });

  it("does not roll hours over at 24 (unbounded HH)", () => {
    expect(formatElapsed(25 * 60 * 60 * 1000)).toBe("25:00:00.00");
  });
});

describe("stopwatch state transitions", () => {
  it("starts at zero and not running", () => {
    const state = createState();
    expect(state.running).toBe(false);
    expect(elapsedMs(state, 1000)).toBe(0);
  });

  it("elapsed grows with now while running", () => {
    const started = start(createState(), 1000);
    expect(started.running).toBe(true);
    expect(elapsedMs(started, 1000)).toBe(0);
    expect(elapsedMs(started, 3500)).toBe(2500);
  });

  it("stop banks the elapsed value and freezes it", () => {
    const started = start(createState(), 1000);
    const stopped = stop(started, 4000);
    expect(stopped.running).toBe(false);
    expect(stopped.accumulatedMs).toBe(3000);
    // Frozen: later timestamps do not change the elapsed value.
    expect(elapsedMs(stopped, 9999)).toBe(3000);
  });

  it("resume continues from the banked value, not from zero", () => {
    const started = start(createState(), 1000);
    const stopped = stop(started, 4000); // banked 3000 ms
    const resumed = start(stopped, 10000);
    expect(resumed.accumulatedMs).toBe(3000);
    expect(elapsedMs(resumed, 12000)).toBe(5000); // 3000 banked + 2000 live
  });

  it("reset returns to zero and not running", () => {
    const started = start(createState(), 1000);
    const afterReset = reset(started);
    expect(afterReset.running).toBe(false);
    expect(elapsedMs(afterReset, 5000)).toBe(0);
  });

  it("start is idempotent while already running", () => {
    const started = start(createState(), 1000);
    const again = start(started, 2000);
    // startedAt must be preserved so the running delta is not lost.
    expect(again.startedAt).toBe(1000);
    expect(elapsedMs(again, 3000)).toBe(2000);
  });

  it("stop is idempotent while already stopped", () => {
    const stopped = stop(createState(), 1000);
    expect(stopped.running).toBe(false);
    expect(stopped.accumulatedMs).toBe(0);
  });
});

describe("lap helpers", () => {
  it("recording appends the current elapsed value", () => {
    let laps = clearLaps();
    laps = recordLap(laps, 1500);
    laps = recordLap(laps, 4200);
    expect(laps).toEqual([1500, 4200]);
  });

  it("recording does not mutate the original array", () => {
    const laps = [1000];
    const next = recordLap(laps, 2000);
    expect(laps).toEqual([1000]);
    expect(next).toEqual([1000, 2000]);
  });

  it("clearing empties the lap list", () => {
    expect(clearLaps()).toEqual([]);
  });

  it("clearing laps leaves elapsed and running state unchanged", () => {
    const state = start(createState(), 1000);
    const elapsedBefore = elapsedMs(state, 5000);
    // clearLaps only touches the lap list; it takes no state and returns [].
    const laps = clearLaps();
    expect(laps).toEqual([]);
    expect(state.running).toBe(true);
    expect(elapsedMs(state, 5000)).toBe(elapsedBefore);
  });
});
