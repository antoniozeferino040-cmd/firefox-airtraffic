import { build, context } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";

const watch = process.argv.includes("--watch");
const dist = "dist";

// Clean
rmSync(dist, { recursive: true, force: true });

// Copy static assets (strip src/ prefix for dist)
const staticFiles = [
  ["icons", "icons"],
  ["src/popup/popup.html", "popup/popup.html"],
  ["src/popup/popup.css", "popup/popup.css"],
  ["src/options/options.html", "options/options.html"],
  ["src/options/options.css", "options/options.css"],
  ["src/shared/shared.css", "shared/shared.css"],
];

for (const [src, dest] of staticFiles) {
  const target = `${dist}/${dest}`;
  mkdirSync(target.substring(0, target.lastIndexOf("/")), { recursive: true });
  cpSync(src, target, { recursive: true });
}

// Copy manifest with updated paths (strip src/ prefix)
const manifest = JSON.parse(readFileSync("manifest.json", "utf-8"));
manifest.background.scripts = manifest.background.scripts.map((s) => s.replace(/^src\//, "").replace(/\.ts$/, ".js"));
manifest.browser_action.default_popup = manifest.browser_action.default_popup.replace(/^src\//, "");
manifest.options_ui.page = manifest.options_ui.page.replace(/^src\//, "");
writeFileSync(`${dist}/manifest.json`, JSON.stringify(manifest, null, 2));

// Fix CSS paths in HTML (../shared/ → ../shared/)
// No change needed since relative paths stay the same after stripping src/

// Bundle TS entry points
const options = {
  entryPoints: [
    "src/background.ts",
    "src/popup/popup.ts",
    "src/options/options.ts",
  ],
  bundle: true,
  outdir: dist,
  format: "iife",
  platform: "browser",
  target: "firefox115",
  minify: !watch,
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(options);
}
