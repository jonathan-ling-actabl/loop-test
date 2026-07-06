import { describe, it, expect } from "vitest";

// Placeholder smoke test establishing the Vitest + jsdom harness.
// Per-app tests should live alongside their app (apps/<name>/*.test.js) or here.
describe("test harness", () => {
  it("runs assertions", () => {
    expect(1 + 1).toBe(2);
  });

  it("has a jsdom DOM available", () => {
    document.body.innerHTML = `<span id="x">hi</span>`;
    expect(document.getElementById("x").textContent).toBe("hi");
  });
});
