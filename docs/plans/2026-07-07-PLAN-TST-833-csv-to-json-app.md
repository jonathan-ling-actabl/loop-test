# Plan: CSV to JSON App (TST-833)

> Source PRD: docs/specs/2026-07-07-PRD-TST-833-csv-to-json-app.md
> Ticket: TST-833 (epic, P1)

## Architectural decisions

Durable decisions that apply across all phases:

- **App location / route**: new self-contained app at `apps/csv-to-json/` with
  `index.html`, `style.css`, `script.js`. Reachable from the root landing page
  via a link in `#app-list` (display name "CSV to JSON"), and back via a
  "← Back" link to `../../index.html`. This mirrors the existing
  `apps/countdown-timer/` layout.
- **Stack**: plain HTML + CSS + vanilla JS, ES modules (`<script type="module">`),
  no build step, no frameworks, no runtime/conversion libraries. Runs by opening
  the file.
- **Module shape**: conversion logic lives in pure, exported functions in
  `script.js` (`csvToJson`, `jsonToCsv`) that take input text and return a
  result object (success value or error message) without throwing. The DOM
  wiring layer contains no conversion logic; it only reads inputs, calls the
  pure functions, and writes results/warnings.
- **Data models**:
  - CSV → JSON: first row = header; each subsequent row = one object keyed by
    header names; values are strings. Output is a JSON array of objects,
    pretty-printed.
  - JSON → CSV: input is a single object or an array of objects; header row is
    the union of keys in first-seen order; one CSV row per object. Nested
    objects/arrays as values are unsupported → warning.
  - CSV quoting: RFC-4180-style — fields containing comma, double quote, or
    newline are wrapped in double quotes; embedded quotes are doubled.
- **Error contract**: pure functions return a discriminated result
  (`{ ok: true, value }` / `{ ok: false, error }`); UI renders `error` into an
  `aria-live` warning region and leaves the target text box untouched.
- **Testing**: Vitest (jsdom) via `mise run test`; formatting via
  `mise run lint` (Prettier). Test files as `apps/csv-to-json/*.test.js`,
  following `apps/countdown-timer/script.test.js` (pure-function behavior) and
  `scaffold.test.js` (HTML wiring) as prior art.

---

## Phase 1: Scaffold and wire up the app end-to-end

**User stories**: 1, 2, 3, 9 (partial — reachability + a working simplest-case
CSV → JSON path)

### What to build

A thin but complete vertical slice: the new `apps/csv-to-json/` folder with
`index.html` (two labelled `<textarea>`s — CSV input and JSON output — a
"Convert to JSON" button, a "← Back" link, a warning region, links to
`style.css` and `script.js`), a minimal `style.css`, and a `script.js` that
exports a `csvToJson` function handling the simplest well-formed case (a header
row plus comma-separated data rows, no quoting) and wires the button to write
its result into the JSON box. Add the "CSV to JSON" link to `#app-list` in the
root `index.html`. Add a scaffold test mirroring the Countdown Timer's.

### Acceptance criteria

- [ ] The app folder `apps/csv-to-json/` exists with `index.html`, `style.css`,
      and `script.js`.
- [ ] The root `index.html` `#app-list` contains a link to
      `apps/csv-to-json/index.html` labelled "CSV to JSON".
- [ ] The app's `index.html` includes a "← Back" link whose href is
      `../../index.html` and links its own `style.css` and `script.js`.
- [ ] When the user pastes simple comma-separated CSV with a header row and
      clicks "Convert to JSON", the JSON text box shall show the equivalent JSON
      array of objects keyed by the header.
- [ ] A scaffold test verifies the back link and stylesheet/script links, and a
      unit test verifies `csvToJson` on a simple input; `mise run test` and
      `mise run lint` pass.

---

## Phase 2: Robust CSV → JSON parsing, quoting, and warnings

**User stories**: 4, 8 (and hardening of 2, 3)

### What to build

Extend `csvToJson` to be RFC-4180 aware: correctly parse fields wrapped in
double quotes that contain commas, embedded (doubled) quotes, or newlines;
ignore blank trailing lines; and return an error for empty input and for
malformed CSV (e.g. ragged rows whose column count does not match the header).
Wire the empty/invalid cases to render a warning into the `aria-live` region
without overwriting the JSON box.

### Acceptance criteria

- [ ] When the user clicks "Convert to JSON" with an empty CSV box, the app
      shall show a warning and shall not change the JSON box.
- [ ] When the CSV input is malformed (e.g. a data row with a different column
      count than the header), the app shall show a descriptive warning and
      shall not produce JSON.
- [ ] When a CSV field is double-quoted and contains a comma, a doubled quote,
      or a newline, `csvToJson` shall parse it into the correct single field
      value.
- [ ] Unit tests cover: simple round of rows, quoted fields with commas/quotes,
      empty input error, and malformed/ragged input error; `mise run test` and
      `mise run lint` pass.

---

## Phase 3: Reverse direction (JSON → CSV) and Clear

**User stories**: 5, 6, 7, 8, 9

### What to build

Add the "Convert to CSV" and "Clear" controls to `index.html`. Implement and
export `jsonToCsv`, converting a single object or an array of objects into CSV
(union-of-keys header in first-seen order, one row per object, RFC-4180 quoting
on generation), returning an error for empty input, invalid JSON, or
nested/unsupported structures. Wire "Convert to CSV" to write into the CSV box
and warn on failure, and wire "Clear" to empty both text boxes and the warning
region.

### Acceptance criteria

- [ ] When the user pastes a valid array of flat objects and clicks "Convert to
      CSV", the CSV box shall show a header row plus one row per object, with
      fields correctly quoted where needed.
- [ ] When the JSON box is empty, contains invalid JSON, or contains a
      nested/unsupported structure, the app shall show a descriptive warning and
      shall not produce CSV.
- [ ] When the user clicks "Clear", both the CSV and JSON text boxes and any
      warning message shall be emptied.
- [ ] Unit tests cover: array-of-objects → CSV, single object → CSV, quoting on
      generation, empty/invalid/nested JSON errors, and a CSV → JSON → CSV
      round-trip stability check; `mise run test` and `mise run lint` pass.
