# Plan: Stopwatch App (TST-bh3)

> Source PRD: docs/specs/2026-07-07-PRD-TST-bh3-stopwatch-app.md
> Source ticket: TST-bh3

## Architectural decisions

Durable decisions that apply across all phases:

- **App location**: `apps/stopwatch/` with `index.html`, `style.css`,
  `script.js` — self-contained, no imports from other app folders (per
  CLAUDE.md). Runs by opening the file; no build step, no external deps.
- **Landing-page route**: a `Stopwatch` link in `#app-list` of the root
  `index.html`, pointing at `apps/stopwatch/index.html`, alongside the existing
  `Blank` and `Countdown Timer` entries.
- **State model**: in-memory only (no `localStorage`). Canonical state shape
  `{ running: boolean, startedAt: number|null, accumulatedMs: number }`, with
  laps held as an array of elapsed-millisecond durations. Elapsed =
  `accumulatedMs + (running ? now - startedAt : 0)`.
- **Timing source of truth**: wall-clock timestamps (`Date.now()`), not
  interval-tick counts. `setInterval` (~50–100 ms) only drives rendering.
- **Time format**: `HH:MM:SS.cs` (zero-padded hours, minutes, seconds,
  centiseconds).
- **Testability boundary**: all time math and formatting live in exported pure
  functions in `script.js`; DOM/timer wiring lives in `initApp()`. Tests are
  `apps/stopwatch/*.test.js`, run by Vitest + jsdom (config already includes
  `apps/**/*.test.js`).
- **Prior art to follow**: `apps/countdown-timer/` for file structure,
  `initApp()` pattern, pure-logic tests with injected timestamps, and scaffold
  test.
- **Gates**: `mise run lint` (Prettier) and `mise run test` (Vitest) must pass
  before done.

---

## Phase 1: Scaffold and register the app

**User stories**: 8

### What to build

Create `apps/stopwatch/` with a minimal but complete `index.html`, `style.css`,
and `script.js` (the JS may be a near-empty module at this phase). The page has
a back link, a title, a placeholder elapsed-time display, and control buttons
(Start, Stop, Reset, Lap, Clear laps) as static markup. Register the app in the
root `index.html` `#app-list`. Add `apps/stopwatch/scaffold.test.js` mirroring
the countdown-timer scaffold test. This is a thin end-to-end slice: the app is
reachable, linked, styled, and its HTML contract is verified — even before any
timing logic exists.

### Acceptance criteria

- [ ] The system shall serve `apps/stopwatch/index.html` with a back link whose
      href is `../../index.html`.
- [ ] The page shall link its own `style.css` and `script.js` via relative
      paths, with JS loaded as a module from `script.js` (not inline).
- [ ] The root `index.html` `#app-list` shall contain a `Stopwatch` link
      pointing to `apps/stopwatch/index.html`.
- [ ] When `mise run test` runs, the scaffold test shall pass, asserting the
      back link and the linked stylesheet/script.
- [ ] When `mise run lint` runs, all new files shall pass Prettier formatting.

---

## Phase 2: Core stopwatch — start, stop, resume, reset

**User stories**: 1, 2, 3, 4

### What to build

Implement the timing engine and wire it to the UI so the stopwatch counts up
live. Add exported pure functions: an elapsed-to-`HH:MM:SS.cs` formatter and a
state helper that computes elapsed ms and applies start/stop/reset transitions
given an injected `now` timestamp. In `initApp()`, drive a render loop
(`setInterval` ~50–100 ms) that shows the formatted elapsed time while running.
Start begins/resumes counting from the current value; Stop pauses and preserves
the value; Start after Stop resumes from the preserved value; Reset returns to
zero and stops. Disable Stop while idle-at-zero. Add unit tests for the
formatter and the state helper.

### Acceptance criteria

- [ ] When the user activates Start while idle or stopped, the system shall
      begin/resume accumulating elapsed time from its current value.
- [ ] While running, the system shall update the displayed elapsed time at
      least every 100 ms.
- [ ] When the user activates Stop while running, the system shall freeze and
      preserve the current elapsed value.
- [ ] When the user activates Start after a Stop, the system shall continue from
      the preserved value, not from zero.
- [ ] When the user activates Reset, the system shall set elapsed time to zero
      and stop counting.
- [ ] The system shall format elapsed time as zero-padded `HH:MM:SS.cs`.
- [ ] Unit tests shall verify: formatting at zero, sub-second, and
      second/minute/hour boundaries; and state transitions start → elapsed grows
      with `now` → stop banks value → resume continues → reset to zero.
- [ ] `mise run lint` and `mise run test` shall pass.

---

## Phase 3: Laps — record, list, and clear

**User stories**: 5, 6, 7

### What to build

Add lap support on top of the running stopwatch. Add exported pure helpers to
append the current elapsed value to a lap list and to clear the list. In
`initApp()`, wire the Lap button (records current elapsed time into an on-screen
list) and the Clear-laps button (empties the list without touching elapsed or
running state). Reset (from Phase 2) also clears laps. Disable Lap while
idle-at-zero. Add unit tests for the lap helpers.

### Acceptance criteria

- [ ] When the user activates Lap while running, the system shall record the
      current elapsed time as a new lap and display it in the lap list.
- [ ] Recorded laps shall be shown formatted as `HH:MM:SS.cs`.
- [ ] When the user activates Clear laps, the system shall remove all laps from
      the display without changing the elapsed or running state.
- [ ] When the user activates Reset, the system shall also clear all laps.
- [ ] The system shall disable the Stop and Lap controls while idle at zero.
- [ ] Unit tests shall verify: recording appends the current elapsed value;
      clearing empties the list; clearing leaves elapsed/running state
      unchanged.
- [ ] `mise run lint` and `mise run test` shall pass.
