# PRD: Stopwatch App (TST-bh3)

> Source ticket: TST-bh3 — "Add stopwatch application"
> Source spec: https://github.com/florinpop17/app-ideas/blob/master/Projects/1-Beginner/Stopwatch-App.md

## Problem Statement

A user of the loop-test app collection wants to track how long they spend on an
activity. Today the site offers a countdown timer (count *down* to a fixed
future instant) but nothing that counts *up* from a moment the user chooses.
There is no way to measure elapsed time, pause and resume that measurement, or
record intermediate split ("lap") times.

## Solution

Add a new self-contained app under `apps/stopwatch/` that presents a running
elapsed-time display the user can start, stop (pause), resume, and reset. While
running, the user can record lap times, which are listed on screen, and can
clear the recorded laps. The app is reachable from the root landing page and
follows every convention already established by the existing apps (plain
HTML/CSS/vanilla JS, no build step, exportable testable logic, back link,
accessibility).

## Requirements

Functional requirements in EARS format:

1. When the user activates the Start control while the stopwatch is idle or
   stopped, the system shall begin (or resume) accumulating elapsed time from
   its current value.
2. While the stopwatch is running, the system shall update the on-screen
   elapsed-time display at least every 100 milliseconds.
3. When the user activates the Stop control while the stopwatch is running, the
   system shall stop accumulating elapsed time and shall preserve the current
   elapsed value.
4. When the user activates the Start control after a Stop, the system shall
   continue counting up from the preserved elapsed value (not from zero).
5. When the user activates the Reset control, the system shall set the elapsed
   time back to zero, stop counting, and clear all recorded laps.
6. When the user activates the Lap control while the stopwatch is running, the
   system shall record the current elapsed time as a new lap and display it in
   the on-screen lap list.
7. When the user activates the Clear-laps control, the system shall remove all
   recorded laps from the display without affecting the running/elapsed state.
8. The system shall format elapsed time and lap times as `HH:MM:SS.cs`
   (hours, minutes, seconds, centiseconds), with each component zero-padded.
9. While the stopwatch is idle at zero, the system shall disable the Stop and
   Lap controls so only valid actions are available.
10. Assumption (derived from app-ideas spec, no human input needed):
    elapsed-time measurement shall be based on wall-clock timestamps
    (`Date.now()` / `performance.now()`-style deltas) rather than on counting
    interval ticks, so that display lag or throttled timers do not accumulate
    drift into the measured time.

Non-functional (implied by repo conventions in CLAUDE.md):

11. The system shall run by opening `apps/stopwatch/index.html` directly in a
    browser with no build step and no external dependencies.
12. The system shall keep its time-computation and formatting logic in
    exportable functions so they can be unit-tested with Vitest/jsdom.

## User Stories

1. As a user, I want to start the stopwatch, so that I can begin timing an
   activity.
2. As a user, I want to stop (pause) the stopwatch, so that I can hold the
   elapsed time while I step away.
3. As a user, I want to resume a stopped stopwatch, so that timing continues
   from where I paused rather than restarting from zero.
4. As a user, I want to reset the stopwatch to zero, so that I can start timing
   a fresh activity.
5. As a user, I want to record lap times while the stopwatch runs, so that I
   can capture split times without stopping the clock.
6. As a user, I want to see all my recorded laps listed on screen, so that I
   can compare split times.
7. As a user, I want to clear all recorded laps, so that I can tidy up the list
   without losing my current elapsed time.
8. As a user, I want the app linked from the landing page with a back link, so
   that I can navigate to and from it like the other apps.

## Implementation Decisions

- **New app module**: `apps/stopwatch/` containing `index.html`, `style.css`,
  `script.js`, following the exact structure of `apps/countdown-timer/`.
- **Landing-page registration**: add a `Stopwatch` list item to `#app-list` in
  the root `index.html`, mirroring the existing `Countdown Timer` entry.
- **Deep, testable time module**: extract pure functions from `script.js`
  (exported, no DOM/timer dependencies):
  - A time-formatting function turning a millisecond duration into an
    `HH:MM:SS.cs` string with padded components.
  - A stopwatch-state reducer/helper that, given the current state
    (`{ running, startedAt, accumulatedMs }`) and an action (start / stop /
    reset / a "now" timestamp), returns the new state and/or the current
    elapsed milliseconds. This keeps timing math independent of `setInterval`
    and the DOM so it is deterministic under test.
  - A lap helper that appends the current elapsed value to a lap list and a
    clear helper that empties it (laps stored as an array of millisecond
    durations).
- **DOM/timer wiring** lives in an `initApp()` that reads control elements by
  id, drives a `setInterval(~50–100ms)` render loop while running, and mutates
  the state via the pure helpers — mirroring `initApp()` in the countdown
  timer.
- **Elapsed-time accuracy**: elapsed = `accumulatedMs + (running ? now -
  startedAt : 0)`, so pausing banks the delta into `accumulatedMs` and the
  interval only drives rendering, never the source of truth (per Requirement
  10). Timestamps come from `Date.now()`.
- **No persistence**: unlike the countdown timer, the stopwatch does not use
  `localStorage`; state is in-memory for the page session (the app-ideas spec
  does not call for persistence).
- **Control states**: Start acts as Start/Resume; Stop and Lap are disabled
  while idle-at-zero; button labels/aria reflect the current state.

## Testing Decisions

- **What makes a good test**: assert external behavior of the pure logic —
  given inputs (durations, state + action + timestamp) it returns the expected
  formatted string / new state / elapsed value. Do not assert on
  `setInterval`, private variables, or exact DOM markup beyond the scaffold
  contract.
- **Modules tested** (`apps/stopwatch/script.test.js`):
  - Time formatting: zero, sub-second, seconds/minutes/hours boundaries,
    centisecond rounding/truncation, padding.
  - Stopwatch state helper: start from zero, elapsed grows with `now`, stop
    banks elapsed and freezes it, resume continues from banked value, reset
    returns to zero and not-running.
  - Lap helper: recording appends the current elapsed value; clearing empties
    the list; clearing does not change elapsed/running state.
- **Scaffold test** (`apps/stopwatch/scaffold.test.js`): mirror the
  countdown-timer scaffold test — the app's `index.html` links back to
  `../../index.html` and links its own `style.css` and `script.js`.
- **Prior art**: `apps/countdown-timer/script.test.js` (pure-logic unit tests
  with deterministic injected timestamps) and
  `apps/countdown-timer/scaffold.test.js` (HTML contract via jsdom). Tests run
  under Vitest + jsdom per `vitest.config.js` (`apps/**/*.test.js`).

## Out of Scope

- Persistence of elapsed time or laps across page reloads / sessions.
- Multiple simultaneous independent stopwatches.
- Countdown / target-time behavior (already covered by the countdown-timer app).
- Sound/notification on any event.
- Exporting or sharing lap data.
- Sub-centisecond (millisecond) display precision.

## Further Notes

- The app-ideas spec's four core user stories (start, stop, resume, restart) are
  all in-scope core; the two bonus features (create laps, clear laps) are also
  included as they are low-cost and improve the app's usefulness.
- No genuine requirements ambiguity required escalation to a human; the ticket
  plus the linked app-ideas spec fully determine behavior. The only judgment
  calls (centisecond precision, timestamp-based timing over tick-counting,
  no persistence) are recorded above as explicit decisions.
