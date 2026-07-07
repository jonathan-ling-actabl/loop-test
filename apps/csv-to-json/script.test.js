import { describe, it, expect } from "vitest";
import { csvToJson, jsonToCsv } from "./script.js";

describe("csvToJson", () => {
  it("converts a simple header + rows CSV into an array of objects", () => {
    const result = csvToJson("name,age\nAda,36\nGrace,45");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([
      { name: "Ada", age: "36" },
      { name: "Grace", age: "45" },
    ]);
  });

  it("keeps all values as strings", () => {
    const result = csvToJson("n\n1\ntrue");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ n: "1" }, { n: "true" }]);
  });

  it("ignores blank trailing lines", () => {
    const result = csvToJson("a,b\n1,2\n\n");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ a: "1", b: "2" }]);
  });

  it("handles a header with no data rows", () => {
    const result = csvToJson("a,b");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([]);
  });

  it("parses a quoted field containing a comma as a single value", () => {
    const result = csvToJson('name,note\nAda,"Lovelace, first programmer"');
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ name: "Ada", note: "Lovelace, first programmer" }]);
  });

  it("parses a quoted field containing doubled quotes", () => {
    const result = csvToJson('q\n"She said ""hi"""');
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ q: 'She said "hi"' }]);
  });

  it("parses a quoted field containing a newline", () => {
    const result = csvToJson('text\n"line one\nline two"');
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ text: "line one\nline two" }]);
  });

  it("handles CRLF line endings", () => {
    const result = csvToJson("a,b\r\n1,2\r\n3,4");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("returns an error for empty input", () => {
    const result = csvToJson("");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/paste some csv/i);
  });

  it("returns an error for whitespace-only input", () => {
    const result = csvToJson("   \n  ");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/paste some csv/i);
  });

  it("returns an error for a ragged row with too few fields", () => {
    const result = csvToJson("a,b,c\n1,2");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/malformed/i);
  });

  it("returns an error for a ragged row with too many fields", () => {
    const result = csvToJson("a,b\n1,2,3");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/malformed/i);
  });

  it("returns an error for an unterminated quoted field", () => {
    const result = csvToJson('a\n"unterminated');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/malformed/i);
  });
});

describe("jsonToCsv", () => {
  it("converts an array of flat objects into a header row plus one row each", () => {
    const result = jsonToCsv('[{"name":"Ada","age":"36"},{"name":"Grace","age":"45"}]');
    expect(result.ok).toBe(true);
    expect(result.value).toBe("name,age\nAda,36\nGrace,45");
  });

  it("converts a single object into a header row plus one data row", () => {
    const result = jsonToCsv('{"name":"Ada","age":"36"}');
    expect(result.ok).toBe(true);
    expect(result.value).toBe("name,age\nAda,36");
  });

  it("uses the union of keys in first-seen order", () => {
    const result = jsonToCsv('[{"a":"1"},{"a":"2","b":"3"}]');
    expect(result.ok).toBe(true);
    expect(result.value).toBe("a,b\n1,\n2,3");
  });

  it("quotes fields that contain commas, quotes, or newlines", () => {
    const result = jsonToCsv('[{"note":"a, b","q":"say \\"hi\\"","m":"one\\ntwo"}]');
    expect(result.ok).toBe(true);
    expect(result.value).toBe('note,q,m\n"a, b","say ""hi""","one\ntwo"');
  });

  it("renders null values as empty fields", () => {
    const result = jsonToCsv('[{"a":"1","b":null}]');
    expect(result.ok).toBe(true);
    expect(result.value).toBe("a,b\n1,");
  });

  it("returns an error for empty input", () => {
    const result = jsonToCsv("");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/paste some json/i);
  });

  it("returns an error for invalid JSON", () => {
    const result = jsonToCsv("{not json}");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid json/i);
  });

  it("returns an error for a nested object value", () => {
    const result = jsonToCsv('[{"a":{"b":"c"}}]');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nested/i);
  });

  it("returns an error for an array value inside an object", () => {
    const result = jsonToCsv('[{"a":[1,2]}]');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nested/i);
  });

  it("returns an error for a JSON scalar (not an object or array of objects)", () => {
    const result = jsonToCsv("42");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/expected an object/i);
  });

  it("returns an error for an empty array", () => {
    const result = jsonToCsv("[]");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/empty/i);
  });
});

describe("round-trip stability", () => {
  it("CSV -> JSON -> CSV preserves well-formed data", () => {
    const csv = 'name,note\nAda,"Lovelace, first"\nGrace,Hopper';
    const json = csvToJson(csv);
    expect(json.ok).toBe(true);
    const back = jsonToCsv(json.value);
    expect(back.ok).toBe(true);
    expect(back.value).toBe(csv);
  });
});

describe("csvToJson with a custom delimiter (TST-25u)", () => {
  it("splits fields on a tab delimiter", () => {
    const result = csvToJson("name\tage\nAda\t36\nGrace\t45", "\t");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([
      { name: "Ada", age: "36" },
      { name: "Grace", age: "45" },
    ]);
  });

  it("splits fields on a pipe delimiter", () => {
    const result = csvToJson("name|age\nAda|36", "|");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ name: "Ada", age: "36" }]);
  });

  it("splits fields on a semicolon delimiter", () => {
    const result = csvToJson("name;age\nAda;36", ";");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ name: "Ada", age: "36" }]);
  });

  it("splits fields on a colon delimiter", () => {
    const result = csvToJson("name:age\nAda:36", ":");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ name: "Ada", age: "36" }]);
  });

  it("does not split on commas when a non-comma delimiter is selected", () => {
    const result = csvToJson("name|note\nAda|Lovelace, first programmer", "|");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ name: "Ada", note: "Lovelace, first programmer" }]);
  });

  it("parses a quoted field containing the selected delimiter as one value", () => {
    const result = csvToJson('name\tnote\nAda\t"Lovelace\tfirst programmer"', "\t");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ name: "Ada", note: "Lovelace\tfirst programmer" }]);
  });

  it("parses a quoted field containing a pipe delimiter as one value", () => {
    const result = csvToJson('name|note\nAda|"a|b|c"', "|");
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.value)).toEqual([{ name: "Ada", note: "a|b|c" }]);
  });
});

describe("jsonToCsv with a custom delimiter (TST-25u)", () => {
  it("separates fields with a tab delimiter", () => {
    const result = jsonToCsv('[{"name":"Ada","age":"36"},{"name":"Grace","age":"45"}]', "\t");
    expect(result.ok).toBe(true);
    expect(result.value).toBe("name\tage\nAda\t36\nGrace\t45");
  });

  it("separates fields with a pipe delimiter", () => {
    const result = jsonToCsv('[{"name":"Ada","age":"36"}]', "|");
    expect(result.ok).toBe(true);
    expect(result.value).toBe("name|age\nAda|36");
  });

  it("quotes a field containing the selected delimiter, not a comma", () => {
    const result = jsonToCsv('[{"note":"a|b","plain":"x,y"}]', "|");
    expect(result.ok).toBe(true);
    // "a|b" contains the pipe so it is quoted; "x,y" contains only a comma
    // (not the delimiter) so it stays unquoted.
    expect(result.value).toBe('note|plain\n"a|b"|x,y');
  });

  it("quotes a field containing a tab delimiter and doubles embedded quotes", () => {
    const result = jsonToCsv('[{"v":"a\\tb","q":"say \\"hi\\""}]', "\t");
    expect(result.ok).toBe(true);
    expect(result.value).toBe('v\tq\n"a\tb"\t"say ""hi"""');
  });
});

describe("custom-delimiter round-trip stability (TST-25u)", () => {
  it("delimited text -> JSON -> delimited text is stable with a pipe delimiter", () => {
    const src = 'name|note\nAda|"Lovelace|first"\nGrace|Hopper';
    const json = csvToJson(src, "|");
    expect(json.ok).toBe(true);
    const back = jsonToCsv(json.value, "|");
    expect(back.ok).toBe(true);
    expect(back.value).toBe(src);
  });

  it("delimited text -> JSON -> delimited text is stable with a tab delimiter", () => {
    const src = "name\tage\nAda\t36\nGrace\t45";
    const json = csvToJson(src, "\t");
    expect(json.ok).toBe(true);
    const back = jsonToCsv(json.value, "\t");
    expect(back.ok).toBe(true);
    expect(back.value).toBe(src);
  });
});
