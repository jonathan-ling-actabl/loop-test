import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL as NodeURL } from "node:url";

const dir = fileURLToPath(new NodeURL(".", import.meta.url));
const html = readFileSync(`${dir}index.html`, "utf8");

describe("csv-to-json scaffold", () => {
  it("links back to the landing page", () => {
    document.body.innerHTML = html;
    const back = document.querySelector("a.back");
    expect(back).not.toBeNull();
    expect(back.getAttribute("href")).toBe("../../index.html");
  });

  it("links its own stylesheet and script", () => {
    document.body.innerHTML = html;
    expect(document.querySelector('link[href="style.css"]')).not.toBeNull();
    expect(document.querySelector('script[src="script.js"]')).not.toBeNull();
  });

  it("provides the CSV and JSON text boxes and the three controls", () => {
    document.body.innerHTML = html;
    expect(document.querySelector("#csv-input")).not.toBeNull();
    expect(document.querySelector("#json-output")).not.toBeNull();
    expect(document.querySelector("#to-json")).not.toBeNull();
    expect(document.querySelector("#to-csv")).not.toBeNull();
    expect(document.querySelector("#clear")).not.toBeNull();
  });

  it("labels both text boxes", () => {
    document.body.innerHTML = html;
    expect(document.querySelector('label[for="csv-input"]')).not.toBeNull();
    expect(document.querySelector('label[for="json-output"]')).not.toBeNull();
  });
});
