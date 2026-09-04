import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "next/cache": fileURLToPath(new URL("./tests/helpers/next-cache.ts", import.meta.url)),
      "next/headers": fileURLToPath(new URL("./tests/helpers/next-headers.ts", import.meta.url)),
      "next/navigation": fileURLToPath(new URL("./tests/helpers/next-navigation.ts", import.meta.url))
    }
  },
  oxc: {
    jsx: {
      runtime: "automatic"
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"]
  }
});
