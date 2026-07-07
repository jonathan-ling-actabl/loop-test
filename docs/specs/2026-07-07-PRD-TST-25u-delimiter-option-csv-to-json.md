# PRD: Delimiter option for the CSV to JSON app (TST-25u)

> Ticket: TST-25u (feature, P1) — "Add delimiter option to CSV to JSON app"
> Extends: TST-833 (CSV to JSON app). See
> `docs/specs/2026-07-07-PRD-TST-833-csv-to-json-app.md` and
> `docs/plans/2026-07-07-PLAN-TST-833-csv-to-json-app.md`.

## Problem Statement

As a user of the CSV to JSON app, I have delimited-text data that does not use
commas — tab-separated (TSV), colon-separated, pipe-separated, semicolon-separated,
etc. Today the app hard-codes the comma as the field separator in both
directions, so pasting a tab- or pipe-delimited file either fails to split into
columns (I get one giant column) or produces wrong results. I want to tell the
app which delimiter my data uses so I can convert it correctly.

## Solution

Add a delimiter control to the CSV to JSON app. Before converting, the user
picks the field delimiter from a set of common presets — Comma (`,`), Tab
(`\t`), Semicolon (`;`), Pipe (`|`), and Colon (`:`) — with **Comma selected by
default** so existing behavior is unchanged. The chosen delimiter is used as the
field separator when parsing input during "Convert to JSON", and as the field
separator when generating output during "Convert to CSV". Quoting rules
(RFC-4180 style) continue to apply, now keyed off the selected delimiter rather
than a hard-coded comma: a field is quoted on generation when it contains the
selected delimiter (or a double quote / CR / newline), and on parsing a
double-quoted field may still contain the delimiter, quotes, or newlines.

The same single delimiter setting governs both directions. This keeps the
round trip (paste TSV → Convert to JSON → Convert to CSV) internally
consistent: what you get back uses the delimiter you selected. No new app is
created; this modifies the existing `apps/csv-to-json/` app in place.

## Requirements

Requirements are written in EARS format. All extend the existing CSV to JSON
app; requirements from TST-833 remain in force except where a hard-coded comma
is now replaced by the selected delimiter.

1. The CSV to JSON app shall provide a delimiter control offering the preset
   choices Comma, Tab, Semicolon, Pipe, and Colon.
2. The CSV to JSON app shall default the delimiter control to Comma.
3. When the user activates "Convert to JSON", the CSV to JSON app shall parse
   the input using the currently selected delimiter as the field separator and,
   if valid, render the equivalent JSON array of objects.
4. When the user activates "Convert to CSV", the CSV to JSON app shall generate
   output using the currently selected delimiter as the field separator between
   fields on each row.
5. While a non-comma delimiter is selected, when the app generates output during
   "Convert to CSV", the CSV to JSON app shall wrap a field in double quotes when
   that field contains the selected delimiter, a double quote, a carriage
   return, or a newline, and shall double any embedded double quotes.
6. When parsing a double-quoted field during "Convert to JSON", the CSV to JSON
   app shall treat the selected delimiter, double quotes, and newlines inside the
   quotes as literal field content rather than as separators.
7. The CSV to JSON app shall keep all existing conversion, warning, and Clear
   behaviors from TST-833 unchanged for the default (Comma) delimiter.
8. When the user changes the delimiter selection, the CSV to JSON app shall not
   automatically re-run a conversion or clear existing text; the new delimiter
   applies on the next conversion the user triggers.
9. The delimiter control shall be a labelled, keyboard-usable form control
   associated with an accessible label.
10. The CSV to JSON app shall remain implemented with plain HTML, CSS, and
    vanilla JavaScript only — no build step, frameworks, or conversion libraries.

## User Stories

1. As a site user with tab-separated data, I want to select a Tab delimiter, so
   that pasting a TSV file converts into correct JSON columns.
2. As a site user with pipe- or colon- or semicolon-separated data, I want to
   pick the matching delimiter, so that my non-comma data converts correctly.
3. As a site user, I want a Comma default, so that the app behaves exactly as
   before when I do nothing.
4. As a site user, I want the reverse direction (Convert to CSV) to use the same
   delimiter I selected, so that I can export data in my chosen format and get a
   consistent round trip.
5. As a site user, I want quoted fields to keep working with my chosen delimiter,
   so that values containing the delimiter still convert faithfully.
6. As a site user, I want a clearly labelled delimiter control I can reach by
   keyboard, so that the feature is accessible.

## Implementation Decisions

- **Modify in place**: this changes the existing `apps/csv-to-json/`
  (`index.html`, `style.css`, `script.js`); no new app folder or landing-page
  entry is added.
- **Delimiter control (UI)**: a `<select>` dropdown with an associated
  `<label>`, offering the five presets (Comma, Tab, Semicolon, Pipe, Colon),
  default Comma. A dropdown is chosen over a free-text field because the ticket
  enumerates specific separators and presets keep the control accessible and
  unambiguous (a raw text field would invite empty/multi-char/whitespace edge
  cases). The option values map to the actual separator characters.
- **Parameterize the pure functions**: the existing exported functions
  `csvToJson` and `jsonToCsv` gain an optional delimiter parameter (defaulting
  to `","`). Passing no delimiter reproduces the current behavior exactly, which
  keeps the existing TST-833 tests valid without modification. The internal
  `parseCsv` helper and the field-quoting helper take the delimiter as an
  argument instead of assuming a comma.
- **Quoting keyed off the delimiter**: the generate-side quoting predicate
  changes from "contains comma, quote, CR, or newline" to "contains *the
  selected delimiter*, quote, CR, or newline". Parsing recognizes the selected
  delimiter (rather than a literal comma) as the field boundary outside quotes.
- **Single setting, both directions**: one delimiter selection drives both
  parse (Convert to JSON) and generate (Convert to CSV), read at conversion
  time. This is the least surprising design for a bidirectional converter and
  makes round trips self-consistent.
- **DOM wiring unchanged in shape**: the wiring layer reads the delimiter
  `<select>` value at click time and passes it into the pure function, then
  writes results/warnings exactly as before. No conversion logic moves into the
  wiring layer.
- **Error contract preserved**: pure functions still return
  `{ ok: true, value }` / `{ ok: false, error }` and never throw.
- **Assumption (grounded in ticket, not a confirmed human answer)**: the ticket
  says "import tab separated, colon separated, pipe separated files, etc." — the
  driving use case is parsing (Convert to JSON). Applying the same delimiter to
  the generate direction is a deliberate extension for consistency; it does not
  change the primary ask and keeps behavior predictable.

## Testing Decisions

- **What makes a good test here**: exercise external behavior of the pure
  functions with a delimiter argument — given delimited input and a chosen
  delimiter, assert the produced JSON/CSV string or the error — not internal
  parsing steps.
- **Modules under test**: `csvToJson(text, delimiter)` and
  `jsonToCsv(text, delimiter)` are the primary unit-test targets. A scaffold
  test addition verifies the delimiter control exists in `index.html`, is
  labelled, and defaults to Comma.
- **Backward-compatibility guard**: the existing TST-833 tests (which call the
  functions with no delimiter argument) must continue to pass unchanged, proving
  the comma default preserves prior behavior.
- **Prior art**: `apps/csv-to-json/script.test.js` (pure-function behavior) and
  `apps/csv-to-json/scaffold.test.js` (HTML wiring) are the templates. Tests run
  under Vitest (jsdom) via `mise run test`; formatting via `mise run lint`.
- **Representative new cases**: tab-delimited → JSON; pipe-delimited → JSON;
  semicolon/colon → JSON; a quoted field containing the selected delimiter parses
  as one value; JSON → CSV with a tab (or pipe) delimiter produces
  delimiter-separated rows and quotes fields containing that delimiter; a
  round trip (delimited text → JSON → delimited text) with a non-comma delimiter
  is stable.

## Out of Scope

- Free-text / arbitrary custom delimiter entry (only the five presets). A
  future enhancement if requested.
- Multi-character delimiters and regex delimiters.
- Auto-detection of the delimiter from the pasted content.
- Independent delimiters for input vs. output, or per-textarea delimiter.
- Persisting the delimiter choice between sessions.
- Any change to value-type handling (CSV cells remain JSON strings) or to the
  file-system bonus features already excluded by TST-833.

## Further Notes

- Because the comma remains the default and the delimiter parameter is optional,
  this is a strictly additive change: no existing behavior or test is broken.
- Colon and semicolon as delimiters are unusual but explicitly requested ("colon
  separated") / commonly needed (European CSV uses `;`); including both keeps the
  preset list useful without opening up free-text edge cases.
