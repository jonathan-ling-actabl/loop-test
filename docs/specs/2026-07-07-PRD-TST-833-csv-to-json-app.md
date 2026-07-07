# PRD: CSV to JSON App (TST-833)

> Ticket: TST-833 (epic, P1) — "Add CSV to JSON app"
> Source spec: https://github.com/florinpop17/app-ideas/blob/master/Projects/1-Beginner/CSV2JSON-App.md

## Problem Statement

As a user of the loop-test GitHub Pages site, I have blocks of CSV text that I
want to turn into JSON objects so I can use them in other tools. Today there is
no app on the landing page that does this, so I have to reach for an external
converter or write the transformation by hand.

## Solution

Add a new self-contained app at `apps/csv-to-json/` reachable from the landing
page. The user pastes CSV text into a text box, clicks "Convert to JSON", and
sees the resulting JSON (an array of objects keyed by the CSV header row) in a
second text box. Invalid or empty input produces a clear warning instead of a
broken result.

The referenced app-ideas spec frames CSV2JSON as an extension of a prior
JSON2CSV app and therefore also lists the reverse direction (JSON → CSV) among
its user stories. This repo has no JSON2CSV app to build on, and the ticket's
own ask is specifically "convert my CSV to JSON objects". To deliver a complete,
useful converter that matches the spec's spirit, the app supports both
directions — CSV → JSON (the primary, ticket-driven capability) and JSON → CSV
(the "already implemented in JSON2CSV" stories from the spec) — plus a Clear
button. The bonus file-system features (open/save files by local path) are out
of scope: they are not achievable reliably in a static, dependency-free
browser page.

## Requirements

Requirements are written in EARS format.

1. The CSV to JSON app shall provide a text box in which the user can paste or
   type CSV text.
2. The CSV to JSON app shall provide a text box in which the JSON result is
   shown (and in which the user can paste or type JSON for reverse conversion).
3. When the user activates the "Convert to JSON" control, the CSV to JSON app
   shall parse the CSV input and, if valid, render the equivalent JSON as an
   array of objects (one object per data row, keyed by the header row) into the
   JSON text box.
4. When the user activates "Convert to JSON" and the CSV input is empty, the
   CSV to JSON app shall display a warning message and shall not overwrite the
   JSON text box with a result.
5. When the user activates "Convert to JSON" and the CSV input is not valid
   CSV, the CSV to JSON app shall display a warning message describing the
   problem and shall not produce a JSON result.
6. When the user activates the "Convert to CSV" control, the CSV to JSON app
   shall parse the JSON input and, if it is a valid non-nested array of objects
   (or a single object), render the equivalent CSV — a header row followed by
   one row per object — into the CSV text box.
7. When the user activates "Convert to CSV" and the JSON input is empty, the
   CSV to JSON app shall display a warning message and shall not produce a CSV
   result.
8. When the user activates "Convert to CSV" and the JSON input is not valid
   JSON (or is a nested/unsupported structure), the CSV to JSON app shall
   display a warning message describing the problem and shall not produce a CSV
   result.
9. When the user activates the "Clear" control, the CSV to JSON app shall empty
   both the CSV and JSON text boxes and clear any warning message.
10. The CSV to JSON app shall correctly handle CSV fields that contain commas,
    double quotes, or newlines when they are wrapped in double quotes per the
    common CSV quoting convention (RFC 4180 style), in both parse and generate
    directions.
11. The CSV to JSON app shall be reachable via a link in the `#app-list` list on
    the root landing page (`index.html`), using the display name "CSV to JSON".
12. The CSV to JSON app's page shall include a "← Back" link to
    `../../index.html`.
13. The CSV to JSON app shall be implemented with plain HTML, CSS, and vanilla
    JavaScript only, with no build step, no frameworks, and no runtime or
    conversion libraries.

## User Stories

1. As a site user, I want to paste CSV text into a text box, so that I can
   provide the data I want to convert.
2. As a site user, I want to click a "Convert to JSON" button to validate and
   convert the CSV, so that I get JSON objects from my CSV.
3. As a site user, I want to see the converted result in the JSON text box, so
   that I can read and copy the JSON.
4. As a site user, I want a warning message when the CSV box is empty or does
   not contain valid CSV, so that I understand why no result appeared.
5. As a site user, I want to paste JSON into a text box and click "Convert to
   CSV", so that I can also convert in the reverse direction.
6. As a site user, I want a warning message when the JSON box is empty or does
   not contain valid JSON, so that I understand why no CSV appeared.
7. As a site user, I want a "Clear" button that empties both text boxes, so
   that I can quickly start over.
8. As a site user, I want the app to correctly handle quoted fields containing
   commas or quotes, so that real-world CSV converts faithfully.
9. As a site user, I want to reach the app from the landing page and get back
   to it easily, so that it fits with the other apps on the site.

## Implementation Decisions

- **New app folder**: `apps/csv-to-json/` containing `index.html`,
  `style.css`, and `script.js`, fully self-contained per repo conventions. It
  imports nothing from other app folders.
- **Landing page**: add one `<li><a>` entry to `#app-list` in the root
  `index.html` with display name "CSV to JSON", following the existing
  Countdown Timer / Blank entries.
- **Deep, testable conversion module**: the conversion logic lives in pure
  functions exported from `script.js` (or a sibling module imported by it) so
  it can be unit-tested with no DOM. Proposed interface:
  - `csvToJson(csvText)` → returns a result object carrying either a JSON
    string (an array of row objects) or an error message; does not throw for
    invalid input.
  - `jsonToCsv(jsonText)` → returns a result object carrying either a CSV
    string or an error message; does not throw for invalid input.
  - Internal helpers for RFC-4180-style parsing (splitting a CSV line into
    fields respecting quotes) and for quoting a field when generating CSV.
  These are "deep modules": a simple string-in / result-out interface hiding
  the parsing details, with a stable contract.
- **DOM wiring**: `script.js` reads the two `<textarea>` elements and the
  buttons, calls the pure functions on click, writes results back, and renders
  warnings into a dedicated `role="alert"` / `aria-live` element. The wiring
  layer contains no conversion logic itself.
- **Error contract**: conversion functions return `{ ok: true, value }` or
  `{ ok: false, error }` rather than throwing, so both the UI and the tests can
  assert on outcomes uniformly. (Exact field names are an implementation detail
  to be finalized in the plan/build.)
- **Data shape for CSV → JSON**: the first CSV row is treated as the header;
  each subsequent row becomes one object whose keys are the header names and
  whose values are the (string) cell values. Empty trailing lines are ignored.
- **Data shape for JSON → CSV**: input is either a single object or an array of
  objects; the union of keys (in first-seen order) forms the header row; nested
  objects/arrays as values are treated as unsupported input and yield a
  warning, matching the spec's "Nested JSON structures are not supported"
  constraint.
- **Accessibility**: semantic HTML, `<label>`s associated with each textarea,
  keyboard-usable buttons, and an `aria-live` region for warnings.

## Testing Decisions

- **What makes a good test here**: tests exercise external behavior of the pure
  conversion functions — given input text, assert the produced JSON/CSV string
  or the presence of an error — rather than internal parsing steps.
- **Modules under test**: `csvToJson` and `jsonToCsv` (and their observable
  handling of quoting/edge cases) are the primary unit-test targets. A small
  scaffold test mirrors the existing Countdown Timer `scaffold.test.js`:
  verifying the app's `index.html` has the `← Back` link to `../../index.html`
  and links its own `style.css` and `script.js`.
- **Prior art**: `apps/countdown-timer/script.test.js` (pure-function behavior
  tests) and `apps/countdown-timer/scaffold.test.js` (HTML wiring checks) are
  the templates to follow. Tests run under Vitest (jsdom) via `mise run test`.
- **Representative cases**: simple header+rows round trip; fields with embedded
  commas and quotes (quoted per RFC 4180); empty input → error; malformed CSV
  (ragged rows) → error; invalid JSON → error; nested JSON → unsupported error;
  round-trip stability (CSV → JSON → CSV) for well-formed input.

## Out of Scope

- Bonus file-system features: entering a local file path, "Open CSV/JSON",
  "Save CSV/JSON", and file-not-found / save-failed warnings. A static
  dependency-free browser page cannot read/write arbitrary local paths; these
  are explicitly excluded.
- Nested / hierarchical JSON structures (per the source spec's constraint).
- Any external CSV/JSON conversion library (prohibited by the repo stack rules
  and the spec's constraints).
- Persistence of input/output between sessions.
- Type inference of CSV values (numbers/booleans stay as strings) — can be a
  future enhancement.

## Further Notes

- The ticket references a spec that assumes a pre-existing JSON2CSV app. This
  repo has none, so the reverse (JSON → CSV) direction is built fresh here
  rather than "modified from" an existing app; the observable behavior still
  matches the spec's user stories.
- Value type handling: CSV cells convert to JSON string values; this keeps the
  round trip lossless and avoids ambiguous coercion. Noted as a deliberate
  simplification.
