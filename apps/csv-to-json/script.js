// CSV <-> JSON conversion for the loop-test static site.
//
// The conversion logic lives in pure, exported functions (`csvToJson`,
// `jsonToCsv`) that take input text and return a discriminated result object
// (`{ ok: true, value }` or `{ ok: false, error }`) without ever throwing.
// The DOM wiring layer below contains no conversion logic — it only reads the
// text boxes, calls the pure functions, and writes results/warnings back.

// --- CSV parsing (RFC-4180 style) -----------------------------------------

// Splits a full CSV document into an array of rows, where each row is an array
// of string field values. Handles fields wrapped in double quotes that contain
// commas, newlines, or doubled ("") quotes. Returns { ok, rows } or
// { ok: false, error }.
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  // Tracks whether the current row has seen any character at all, so we can
  // distinguish a genuinely empty trailing line from a row of empty fields.
  let rowHasContent = false;

  const flushRow = () => {
    row.push(field);
    if (rowHasContent || row.length > 1 || field.length > 0) {
      rows.push(row);
    }
    field = "";
    row = [];
    rowHasContent = false;
  };

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      // A quote may only open a field when the field is still empty.
      if (field.length !== 0) {
        return { ok: false, error: "Malformed CSV: unexpected quote in the middle of a field." };
      }
      inQuotes = true;
      rowHasContent = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      rowHasContent = true;
      i += 1;
      continue;
    }

    if (char === "\r") {
      // Normalize CRLF and lone CR into a single row break.
      if (text[i + 1] === "\n") i += 1;
      flushRow();
      i += 1;
      continue;
    }

    if (char === "\n") {
      flushRow();
      i += 1;
      continue;
    }

    field += char;
    rowHasContent = true;
    i += 1;
  }

  if (inQuotes) {
    return { ok: false, error: "Malformed CSV: unterminated quoted field." };
  }

  // Flush the final field/row if the document did not end with a newline.
  flushRow();

  return { ok: true, rows };
}

// --- CSV field generation --------------------------------------------------

// Quotes a single field for CSV output when it contains a comma, double quote,
// carriage return, or newline (RFC-4180 style). Embedded quotes are doubled.
function quoteCsvField(value) {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// --- Public API ------------------------------------------------------------

// Converts CSV text into a JSON string (a pretty-printed array of objects
// keyed by the header row). Returns { ok: true, value } or { ok: false, error }.
export function csvToJson(csvText) {
  if (csvText == null || csvText.trim() === "") {
    return { ok: false, error: "Please paste some CSV to convert." };
  }

  const parsed = parseCsv(csvText);
  if (!parsed.ok) {
    return parsed;
  }

  const rows = parsed.rows;
  if (rows.length === 0) {
    return { ok: false, error: "Please paste some CSV to convert." };
  }

  const header = rows[0];
  if (header.length === 0 || header.every((h) => h === "")) {
    return { ok: false, error: "Malformed CSV: the header row has no columns." };
  }

  const objects = [];
  for (let r = 1; r < rows.length; r += 1) {
    const dataRow = rows[r];
    if (dataRow.length !== header.length) {
      return {
        ok: false,
        error: `Malformed CSV: row ${r + 1} has ${dataRow.length} field(s) but the header has ${header.length}.`,
      };
    }
    const obj = {};
    for (let c = 0; c < header.length; c += 1) {
      obj[header[c]] = dataRow[c];
    }
    objects.push(obj);
  }

  return { ok: true, value: JSON.stringify(objects, null, 2) };
}

// Converts JSON text (a single object or an array of flat objects) into CSV
// text. The header is the union of keys in first-seen order; one row per
// object. Returns { ok: true, value } or { ok: false, error }.
export function jsonToCsv(jsonText) {
  if (jsonText == null || jsonText.trim() === "") {
    return { ok: false, error: "Please paste some JSON to convert." };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Invalid JSON: could not parse the input." };
  }

  const records = Array.isArray(parsed) ? parsed : [parsed];

  if (records.length === 0) {
    return { ok: false, error: "The JSON array is empty; nothing to convert." };
  }

  const isFlatObject = (value) =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => v === null || typeof v !== "object");

  for (const record of records) {
    if (record === null || typeof record !== "object" || Array.isArray(record)) {
      return {
        ok: false,
        error: "Unsupported JSON: expected an object or an array of objects.",
      };
    }
    if (!isFlatObject(record)) {
      return {
        ok: false,
        error: "Unsupported JSON: nested objects or arrays are not supported.",
      };
    }
  }

  // Build the header from the union of keys, preserving first-seen order.
  const header = [];
  const seen = new Set();
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!seen.has(key)) {
        seen.add(key);
        header.push(key);
      }
    }
  }

  const cellToString = (value) => {
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const lines = [header.map(quoteCsvField).join(",")];
  for (const record of records) {
    const line = header.map((key) => quoteCsvField(cellToString(record[key]))).join(",");
    lines.push(line);
  }

  return { ok: true, value: lines.join("\n") };
}

// --- DOM wiring ------------------------------------------------------------

function initApp() {
  const csvBox = document.getElementById("csv-input");
  const jsonBox = document.getElementById("json-output");
  const warningEl = document.getElementById("warning");
  const toJsonBtn = document.getElementById("to-json");
  const toCsvBtn = document.getElementById("to-csv");
  const clearBtn = document.getElementById("clear");

  if (!csvBox || !jsonBox || !warningEl || !toJsonBtn || !toCsvBtn || !clearBtn) {
    return;
  }

  function showWarning(message) {
    warningEl.textContent = message;
  }

  function clearWarning() {
    warningEl.textContent = "";
  }

  toJsonBtn.addEventListener("click", () => {
    clearWarning();
    const result = csvToJson(csvBox.value);
    if (result.ok) {
      jsonBox.value = result.value;
    } else {
      showWarning(result.error);
    }
  });

  toCsvBtn.addEventListener("click", () => {
    clearWarning();
    const result = jsonToCsv(jsonBox.value);
    if (result.ok) {
      csvBox.value = result.value;
    } else {
      showWarning(result.error);
    }
  });

  clearBtn.addEventListener("click", () => {
    csvBox.value = "";
    jsonBox.value = "";
    clearWarning();
  });
}

// Only wire the DOM when a real document with the app markup is present; the
// unit tests import the pure functions and never mount the page.
if (typeof document !== "undefined" && document.getElementById("csv-input")) {
  initApp();
}
