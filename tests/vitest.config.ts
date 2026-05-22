// built-in
import path from "path";

// 3rd 🎉
import { defineConfig } from "vitest/config";

const root = path.resolve(__dirname, "..");

export default defineConfig({
  root,
  resolve: {
    alias: {
      "@src": path.join(root, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
