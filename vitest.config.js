import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Apps manipulate the DOM, so tests run against a simulated browser.
    environment: "jsdom",
    include: ["tests/**/*.test.js", "apps/**/*.test.js"],
  },
});
