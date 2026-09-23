import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const upstream = dirname(require.resolve("jspaint/package.json"));
const font = dirname(
  require.resolve("@fontsource/fusion-pixel-12px-proportional-sc/package.json")
);
const output = resolve(root, "public/vendor/jspaint");
const custom = resolve(root, "integrations/jspaint");

// This directory is generated and ignored by Git; never edit it directly.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const excluded = new Set([
  "sessions.js",
  "electron-main.js",
  "electron-injected.js",
  "test-news.js",
  "vaporwave-fun.js",
  "konami.js",
]);
for (const directory of ["src", "styles", "lib"]) {
  const source = join(upstream, directory);
  await cp(source, join(output, directory), {
    recursive: true,
    filter(path) {
      const parts = relative(source, path).split(/[\\/]/);
      if (directory === "lib") {
        return !["pdf.js", "tracky-mouse"].includes(parts[0]);
      }
      return directory !== "src" || !excluded.has(parts[0]);
    },
  });
}

for (const directory of ["classic", "cursors", "icons", "transforms"]) {
  await cp(
    join(upstream, "images", directory),
    join(output, "images", directory),
    {
      recursive: true,
    }
  );
}
for (const entry of await readdir(join(upstream, "images"), {
  withFileTypes: true,
})) {
  if (entry.isFile() && /\.(png|gif|svg|ico)$/.test(entry.name)) {
    await cp(
      join(upstream, "images", entry.name),
      join(output, "images", entry.name)
    );
  }
}
for (const entry of await readdir(join(upstream, "help"))) {
  if (entry.startsWith("p_")) {
    await cp(join(upstream, "help", entry), join(output, "help", entry));
  }
}
for (const file of [
  "localization/zh/localizations.js",
  "audio/chord.wav",
  "LICENSE.txt",
]) {
  await cp(join(upstream, file), join(output, file));
}
await cp(
  join(font, "files/fusion-pixel-12px-proportional-sc-latin-400-normal.woff2"),
  join(output, "fonts/fusion-pixel.woff2")
);
await cp(join(font, "LICENSE"), join(output, "fonts/OFL.txt"));

// The custom entry point omits sessions and uses in-memory storage only.
await cp(custom, output, { recursive: true });
