import { defineConfig } from "vitest/config";

// No "@/" alias on purpose: tests import with relative paths.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
