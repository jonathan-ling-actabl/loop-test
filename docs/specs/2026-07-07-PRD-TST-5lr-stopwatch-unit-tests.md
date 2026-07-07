# PRD: Unit tests for stopwatch pure logic (TST-5lr)

> Source ticket: TST-5lr — "Add unit tests for stopwatch pure logic (formatter, state, laps)"
> Follow-up to: TST-bh3 (stopwatch app, PR #5, merged to main)
> Related artifacts: docs/specs/2026-07-07-PRD-TST-bh3-stopwatch-app.md,
> docs/plans/2026-07-07-PLAN-TST-bh3-stopwatch-app.md

## Problem Statement

The stopwatch app (`apps/stopwatch/`) shipped in TST-bh3 with its time-math and
formatting logic already extracted into exported pure functions in
`apps/stopwatch/script.js` (`pad2`, `createState`, `elapsedMs`, `start`, `stop`,
`reset`, `formatElapsed`, `recordLap`, `clearLaps`). The TST-bh3 plan called for
unit tests over those functions, but the merged app carries only
`apps/stopwatch/scaffold.test.js` — an HTML-contract test that verifies the page
markup, not the timing logic. The pure functions that are the actual source of
truth for elapsed time, formatting, and laps are therefore untested. A
regression in centisecond truncation, the resume-from-banked-value math, or lap
immutability would ship silently.

## Solution

Add a dedicated unit-test file, `apps/stopwatch/stopwatch.test.js`, that
exercises every exported pure function in `apps/stopwatch/script.js` through its
public interface, using deterministic injected `now` timestamps so no wall clock
or timer is involved. The tests run under the repo's existing Vitest + jsdom
setup (`apps/**/*.test.js`) and must keep `mise run lint` and `mise run test`
green. No production code changes: the stopwatch's behavior is unchanged; only
test coverage is added.

A ready-made, known-good version of this exact test file already exists on an
orphaned local commit (`7f591a7:apps/stopwatch/stopwatch.test.js`, 22 Vitest
tests) whose imports already match the current exports of `script.js` and which
previously passed lint + test. The solution re-adds that file and verifies it,
extending it only if a coverage gap remains.

## Requirements

Functional requirements in EARS format:

1. The system shall provide a test file `apps/stopwatch/stopwatch.test.js` that
   imports the exported pure functions from `apps/stopwatch/script.js`.
2. The test suite shall verify `pad2` left-pads single-digit values to two
   characters and leaves two-digit values unchanged.
3. The test suite shall verify `formatElapsed` produces zero-padded
   `HH:MM:SS.cs` output for: zero, sub-second (centisecond) durations, the
   one-second / one-minute / one-hour boundaries, and a mixed duration.
4. The test suite shall verify `formatElapsed` truncates centiseconds rather
   than rounding up, clamps negative input to zero, and does not roll hours
   over at 24 (hours are unbounded).
5. The test suite shall verify the state helpers over injected `now` timestamps:
   `createState` starts at zero and not-running; `elapsedMs` grows with `now`
   while running; `stop` banks the elapsed value and freezes it against later
   timestamps; `start` after a `stop` resumes from the banked value (not zero);
   `reset` returns to zero and not-running.
6. The test suite shall verify `start` is idempotent while already running
   (preserving `startedAt` so the running delta is not lost) and `stop` is
   idempotent while already stopped.
7. The test suite shall verify the lap helpers: `recordLap` appends the given
   elapsed value and does not mutate the input array; `clearLaps` returns an
   empty list; clearing laps leaves elapsed/running state unchanged.
8. When `mise run test` runs, the new test suite shall pass alongside the
   existing scaffold test and all other suites in the repo.
9. When `mise run lint` runs, the new test file shall pass Prettier formatting.

Non-functional (implied by repo conventions in CLAUDE.md):

10. The system shall add no production-code changes and no new dependencies;
    the change is test-only.
11. The tests shall be deterministic — timing behavior is verified via injected
    `now` arguments, never the real wall clock, `Date.now()`, or `setInterval`.

## User Stories

Do not invent fake actors; the consumer of this feature is the developer /
maintainer of the app collection and the automated CI gates.

1. As a maintainer, I want unit tests over the stopwatch's pure time-math and
   formatting functions, so that a regression in elapsed/format/lap logic is
   caught by `mise run test` instead of shipping silently.
2. As a maintainer, I want the tests to use injected timestamps rather than the
   real clock, so that the suite is deterministic and never flaky.
3. As a maintainer, I want the new tests to follow the same conventions as the
   existing scaffold and countdown-timer tests, so that the test surface stays
   consistent and easy to read.

## Implementation Decisions

- **Test file location and name**: `apps/stopwatch/stopwatch.test.js`, matching
  the `apps/**/*.test.js` glob already configured in `vitest.config.js` and the
  filename the TST-bh3 follow-up ticket references. It lives beside the existing
  `apps/stopwatch/scaffold.test.js` rather than replacing it.
- **Primary strategy — re-add the known-good file**: retrieve the ready-made
  suite from the orphaned commit with
  `git show 7f591a7:apps/stopwatch/stopwatch.test.js` and write it to
  `apps/stopwatch/stopwatch.test.js`. Its import list already matches the actual
  exports of the current `script.js` (verified against the merged source), so no
  edits should be required. Extend it only if a coverage gap against the exports
  remains after verifying it.
- **No production changes**: `apps/stopwatch/script.js`, `index.html`,
  `style.css`, the root `index.html`, and `scaffold.test.js` are all left
  untouched.
- **Public-interface testing only**: tests call the exported functions and
  assert on their return values; they do not reach into `initApp()`, module
  internals, `setInterval`, or DOM markup (the scaffold test already owns the
  HTML contract).

## Testing Decisions

- **What makes a good test**: assert external behavior of each pure function —
  given inputs (a duration, or a state + injected `now`, or a lap array + value)
  it returns the expected formatted string / new state / elapsed value / new
  array. Do not assert on private variables, `setInterval`, or DOM structure.
- **Modules tested** (`apps/stopwatch/stopwatch.test.js`):
  - `pad2` — padding of single- vs two-digit values.
  - `formatElapsed` — zero, sub-second, second/minute/hour boundaries, mixed
    duration, centisecond truncation (not rounding), negative-input clamping,
    unbounded hours past 24.
  - State helpers (`createState`, `elapsedMs`, `start`, `stop`, `reset`) with
    injected `now` — start-at-zero, elapsed grows with `now`, stop banks and
    freezes, resume from banked value, reset to zero, start/stop idempotence.
  - Lap helpers (`recordLap`, `clearLaps`) — append the current elapsed value,
    input array not mutated, clearing empties the list, clearing leaves
    elapsed/running state unchanged.
- **Prior art**: `apps/countdown-timer/script.test.js` (pure-logic unit tests
  with deterministic injected timestamps) and the existing
  `apps/stopwatch/scaffold.test.js` (HTML contract via jsdom). Tests run under
  Vitest + jsdom per `vitest.config.js` (`apps/**/*.test.js`). The re-added file
  itself is the concrete prior art since it previously passed both gates.

## Out of Scope

- Any change to stopwatch production behavior (`script.js`, HTML, CSS).
- Tests of `initApp()` DOM wiring, the render `setInterval` loop, or control
  enable/disable logic (event-handler / integration tests) — the scaffold test
  covers the HTML contract; DOM-behavior tests are not part of this ticket.
- Tests for any other app.
- Adding coverage tooling / thresholds or new dev dependencies.
- Persistence, multiple stopwatches, or any feature not already in the shipped
  app.

## Further Notes

- This is an unambiguous, test-only follow-up; no requirement ambiguity required
  escalation to a human. The known-good source of the test file and the exact
  set of exports to cover are both fully determined by the ticket and the merged
  code.
- Verification path: `git show 7f591a7:apps/stopwatch/stopwatch.test.js` was
  confirmed to import exactly the nine functions currently exported by
  `apps/stopwatch/script.js`, so the re-added file is expected to pass without
  modification.
