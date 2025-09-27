import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: false, // good for debugging
  minify: true, // optional, can enable for browser use
  clean: true,
  target: "es2020",
  splitting: false, // no code-splitting needed for Node library
});
