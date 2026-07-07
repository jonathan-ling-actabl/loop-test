# Plan: Delimiter option for the CSV to JSON app (TST-25u)

> Source PRD: docs/specs/2026-07-07-PRD-TST-25u-delimiter-option-csv-to-json.md
> Ticket: TST-25u (feature, P1) — extends TST-833

## Architectural decisions

Durable decisions that apply across all phases:

- **Modify in place**: this feature changes the existing `apps/csv-to-json/`
  app (`index.html`, `style.css`, `script.js`, `script.test.js`,
  `scaffold.test.js`). No new app folder and no new landing-page entry.
- **Stack unchanged**: plain HTML + CSS + vanilla JS, ES modules, no build step,
  no libraries. Runs by opening the file; tested via `mise run test` (Vitest,
  jsdom) and formatted via `mise run lint` (Prettier).
- **Delimiter control**: a labelled `<select>` in `index.html` with five options
  — Comma, Tab, Semicolon, Pipe, Colon — whose option values map to the actual
  separator characters (`,` `\t` `;` `|` `:`). Default selection is Comma.
- **Pure-function contract**: the exported conversion functions gain an optional
  trailing delimiter parameter that defaults to `","`:
  - `csvToJson(text, delimiter = ",")`
  - `jsonToCsv(text, delimiter = ",")`
  Calling them without the argument reproduces current behavior exactly, so the
  existing TST-833 tests remain valid unchanged. Internal parse and
  field-quoting helpers take the delimiter as an argument rather than assuming a
  comma.
- **Quoting rule keyed off the delimiter**: on generation, a field is quoted
  when it contains the selected delimiter, a double quote, a CR, or a newline
  (embedded quotes doubled). On parsing, the selected delimiter — not a literal
  comma — is the field boundary outside quotes; delimiter/quote/newline inside
  quotes are literal content.
- **Single setting, both directions**: one delimiter drives both Convert to JSON
  (parse) and Convert to CSV (generate), read from the `<select>` at click time
  by the DOM wiring layer, which contains no conversion logic.
- **Error contract preserved**: `{ ok: true, value }` / `{ ok: false, error }`;
  functions never throw.

---

## Phase 1: Delimiter-aware conversion core

**User stories**: 1, 2, 3, 4, 5 (the conversion logic behind all of them)

### What to build

Parameterize the pure conversion layer end-to-end. Give `csvToJson` and
`jsonToCsv` an optional delimiter argument defaulting to comma, and thread that
delimiter through the internal CSV parser (as the outside-quotes field boundary)
and the field-quoting helper (as an additional character that forces quoting).
This is a complete, verifiable slice at the function boundary: with the argument
omitted everything behaves as today, and with a non-comma delimiter passed in,
both directions split/join on that delimiter while quoting still works.

### Acceptance criteria

- [ ] When `csvToJson` is called with a Tab (or Pipe, Semicolon, Colon)
      delimiter, it shall split fields on that delimiter and produce the correct
      JSON array of objects.
- [ ] When a double-quoted field contains the selected delimiter, `csvToJson`
      shall parse it as a single field value.
- [ ] When `jsonToCsv` is called with a non-comma delimiter, it shall separate
      fields with that delimiter and shall quote any field that contains that
      delimiter (or a quote/CR/newline), doubling embedded quotes.
- [ ] When either function is called with no delimiter argument, it shall behave
      identically to the pre-change TST-833 implementation.
- [ ] The existing TST-833 unit tests pass unchanged, and new unit tests cover
      tab/pipe/semicolon/colon parse and generate plus a quoted-field-containing-
      delimiter case; `mise run test` and `mise run lint` pass.

---

## Phase 2: Delimiter control in the UI, wired to conversion

**User stories**: 1, 2, 3, 4, 6

### What to build

Add the labelled delimiter `<select>` (five presets, default Comma) to
`index.html`, style it consistently with the existing controls in `style.css`,
and wire it up in `script.js`: on "Convert to JSON" and "Convert to CSV", read
the selected delimiter value and pass it into the corresponding pure function.
Changing the delimiter does not auto-convert or clear text; it takes effect on
the next conversion. Extend `scaffold.test.js` to assert the control exists, is
labelled, and defaults to Comma.

### Acceptance criteria

- [ ] The app's `index.html` contains a labelled delimiter `<select>` offering
      Comma, Tab, Semicolon, Pipe, and Colon, defaulting to Comma.
- [ ] When the user selects Tab (or Pipe/Semicolon/Colon) and clicks "Convert to
      JSON", the JSON box shall show columns split on the selected delimiter.
- [ ] When the user selects a non-comma delimiter and clicks "Convert to CSV",
      the CSV box shall show rows separated by that delimiter, with quoting where
      needed.
- [ ] When the user changes the delimiter selection, the app shall not auto-run
      a conversion or clear existing text.
- [ ] With Comma selected (the default), all existing convert/warn/Clear
      behaviors are unchanged.
- [ ] `scaffold.test.js` verifies the delimiter control's presence, label, and
      Comma default; `mise run test` and `mise run lint` pass.
