import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  lint: {
    ignorePatterns: [
      "dist/**",
      "test-results/**",
      "playwright-report/**",
      ".agents/**",
      ".claude/**",
    ],
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: [
      "adr/**",
      "README.md",
      "AGENTS.md",
      "docs/**",
      "skills/**",
      "rules/**",
      ".github/**",
      "package-lock.json",
      "public/**",
      "src/data/keys.json",
    ],
  },
  test: { include: ["src/**/*.test.ts", "tests/**/*.test.mjs"] },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /node_modules\/(three|@react-three|three-stdlib)\// }],
        },
      },
    },
  },
});
