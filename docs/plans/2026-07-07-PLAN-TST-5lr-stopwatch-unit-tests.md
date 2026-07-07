# Plan: Unit tests for stopwatch pure logic (TST-5lr)

> Source PRD: docs/specs/2026-07-07-PRD-TST-5lr-stopwatch-unit-tests.md
> Source ticket: TST-5lr (follow-up to TST-bh3)

## Architectural decisions

Durable decisions that apply across all phases:

- **Test file**: `apps/stopwatch/stopwatch.test.js`, added beside the existing
  `apps/stopwatch/scaffold.test.js`. Matches the `apps/**/*.test.js` glob in
  `vitest.config.js`.
- **Source under test**: the nine exported pure functions in
  `apps/stopwatch/script.js` — `pad2`, `createState`, `elapsedMs`, `start`,
  `stop`, `reset`, `formatElapsed`, `recordLap`, `clearLaps`. No production code
  is modified.
- **Primary implementation source**: the known-good test file on orphaned local
  commit `7f591a7`, retrievable via
  `git show 7f591a7:apps/stopwatch/stopwatch.test.js`. Its imports already match
  the current exports; it previously passed lint + test.
- **Determinism**: all timing assertions use injected `now` timestamps; no real
  clock, `Date.now()`, or `setInterval` in the tests.
- **Testing boundary**: public-interface only. No `initApp()` / DOM / render-loop
  tests (the scaffold test owns the HTML contract).
- **Gates**: `mise run lint` (Prettier) and `mise run test` (Vitest + jsdom) must
  pass before done.

---

## Phase 1: Re-add and verify the known-good unit-test suite

**User stories**: 1, 2, 3

### What to build

Retrieve the ready-made test file from the orphaned commit
(`git show 7f591a7:apps/stopwatch/stopwatch.test.js`) and write it to
`apps/stopwatch/stopwatch.test.js`. This is a complete vertical slice: the file
imports every exported pure function from `script.js` and asserts their external
behavior with deterministic injected timestamps, alongside the existing scaffold
test. Run `mise run lint` and `mise run test` to confirm both gates are green.
Because the file's imports already match the current `script.js` exports and it
passed both gates when originally authored, no edits are expected — but if lint
or test surfaces any drift (a renamed/removed export or a formatting nit), fix it
in this phase.

### Acceptance criteria

- [ ] The system shall contain `apps/stopwatch/stopwatch.test.js` importing
      `pad2`, `createState`, `elapsedMs`, `start`, `stop`, `reset`,
      `formatElapsed`, `recordLap`, and `clearLaps` from `./script.js`.
- [ ] The suite shall cover `pad2` padding, and `formatElapsed` for zero,
      sub-second, second/minute/hour boundaries, a mixed duration, centisecond
      truncation (not rounding), negative-input clamping, and unbounded hours
      past 24.
- [ ] The suite shall cover state transitions with injected `now`: start-at-zero,
      elapsed grows with `now`, stop banks and freezes the value, resume from the
      banked value, reset to zero, and start/stop idempotence.
- [ ] The suite shall cover lap helpers: `recordLap` appends and does not mutate
      the input array; `clearLaps` empties the list; clearing leaves
      elapsed/running state unchanged.
- [ ] No file other than `apps/stopwatch/stopwatch.test.js` is changed (no
      production-code edits).
- [ ] When `mise run test` runs, all suites pass, including the new file and the
      existing `scaffold.test.js`.
- [ ] When `mise run lint` runs, the new test file passes Prettier formatting.

---

## Phase 2: Close any residual coverage gap

**User stories**: 1, 2, 3

### What to build

Only if Phase 1 verification reveals an exported function or a required behavior
from the PRD's Testing Decisions that the re-added file does not cover, add the
missing test cases to `apps/stopwatch/stopwatch.test.js` following the same
style (public-interface assertions, injected timestamps). If the re-added suite
already covers all nine exports and every listed behavior — which is the expected
outcome — this phase is a no-op and is closed as such.

### Acceptance criteria

- [ ] Every function exported by `apps/stopwatch/script.js` is exercised by at
      least one assertion in `apps/stopwatch/stopwatch.test.js`.
- [ ] Every behavior listed in the PRD's Testing Decisions has a corresponding
      test case.
- [ ] `mise run lint` and `mise run test` shall pass.
