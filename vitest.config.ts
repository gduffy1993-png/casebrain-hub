import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js "server-only" throws in plain Node. In tests, we treat it as a no-op.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
});

