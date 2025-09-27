import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"], // single ESM output
  dts: true, // generate .d.ts
  sourcemap: false, // easier debugging
  minify: true, // optional for browser use
  clean: true, // remove dist before build
  target: "es2022",
});
