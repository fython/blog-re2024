import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";

const queues = new Map();
const digest = data => createHash("sha256").update(data).digest("hex");
const inside = (directory, path) =>
  path === directory || path.startsWith(directory + sep);

const excluded = new Set([
  "sessions.js",
  "electron-main.js",
  "electron-injected.js",
  "test-news.js",
  "vaporwave-fun.js",
  "konami.js",
]);

async function collectFiles(root) {
  const require = createRequire(join(root, "package.json"));
  const upstream = dirname(require.resolve("jspaint/package.json"));
  const font = dirname(
    require.resolve("@fontsource/fusion-pixel-12px-proportional-sc/package.json")
  );
  const files = new Map();
  async function walk(source, destination, filter = () => true) {
    for (const entry of await readdir(source, { withFileTypes: true })) {
      if (!filter(entry.name)) continue;
      const path = join(source, entry.name);
      const target = join(destination, entry.name);
      if (entry.isDirectory()) await walk(path, target);
      else if (entry.isFile()) files.set(target, path);
    }
  }
  await walk(join(upstream, "src"), "src", name => !excluded.has(name));
  await walk(join(upstream, "styles"), "styles");
  await walk(
    join(upstream, "lib"),
    "lib",
    name => !["pdf.js", "tracky-mouse"].includes(name)
  );
  for (const directory of ["classic", "cursors", "icons", "transforms"]) {
    await walk(join(upstream, "images", directory), join("images", directory));
  }
  for (const entry of await readdir(join(upstream, "images"), {
    withFileTypes: true,
  })) {
    if (entry.isFile() && /\.(png|gif|svg|ico)$/.test(entry.name)) {
      files.set(
        join("images", entry.name),
        join(upstream, "images", entry.name)
      );
    }
  }
  for (const name of await readdir(join(upstream, "help"))) {
    if (name.startsWith("p_"))
      files.set(join("help", name), join(upstream, "help", name));
  }
  for (const name of [
    "localization/zh/localizations.js",
    "audio/chord.wav",
    "LICENSE.txt",
  ]) {
    files.set(name, join(upstream, name));
  }
  files.set(
    "fonts/fusion-pixel.woff2",
    join(font, "files/fusion-pixel-12px-proportional-sc-latin-400-normal.woff2")
  );
  files.set("fonts/OFL.txt", join(font, "LICENSE"));
  // Local customizations take precedence over the upstream runtime.
  await walk(join(root, "integrations/jspaint"), "");
  return files;
}

async function synchronize(config) {
  const started = performance.now();
  if (!config.publicDir) throw new Error("JS Paint requires Vite publicDir");
  const output = join(config.publicDir, "vendor/jspaint");
  const cache = join(config.cacheDir, "paint-assets.json");
  let previous;
  try {
    previous = JSON.parse(await readFile(cache, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  if (previous?.version !== 1 || previous?.output !== output) {
    previous = { version: 1, output, files: {} };
    // Only this generated directory is replaced on a cold start.
    await rm(output, { recursive: true, force: true });
  }
  const files = await collectFiles(config.root);
  const next = { version: 1, output, files: {} };
  let copied = 0;
  let removed = 0;
  for (const [name, source] of files) {
    const hash = digest(await readFile(source));
    const target = join(output, name);
    const old = previous.files[name];
    const info = await stat(target).catch(error => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
    if (
      old?.hash === hash &&
      info?.size === old.size &&
      info?.mtimeMs === old.mtimeMs
    ) {
      next.files[name] = old;
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.paint-tmp`;
    await copyFile(source, temporary);
    await rename(temporary, target);
    const updated = await stat(target);
    next.files[name] = { hash, size: updated.size, mtimeMs: updated.mtimeMs };
    copied++;
  }
  for (const name of Object.keys(previous.files)) {
    if (!files.has(name)) {
      const target = resolve(output, name);
      if (!inside(output, target))
        throw new Error("Invalid JS Paint cache path");
      await rm(target, { force: true });
      removed++;
    }
  }
  if (copied || removed) {
    await mkdir(dirname(cache), { recursive: true });
    await writeFile(`${cache}.tmp`, JSON.stringify(next));
    await rename(`${cache}.tmp`, cache);
    config.logger.info(
      `[jspaint] updated ${copied}, removed ${removed} (${Math.round(performance.now() - started)}ms)`
    );
  }
  return copied + removed;
}

// Astro may resolve more than one Vite config; serialize writes to the same output.
function synchronizeQueued(config) {
  const key = config.publicDir;
  const pending = (queues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(() => synchronize(config));
  queues.set(key, pending);
  return pending;
}

/** @returns {import("vite").Plugin} */
export default function paintAssets() {
  let config;
  let custom;
  let output;
  let cleanup;
  return {
    name: "blog:paint-assets",
    async configResolved(resolved) {
      config = resolved;
      custom = join(config.root, "integrations/jspaint");
      output = join(config.publicDir, "vendor/jspaint");
      // Run before Vite scans/copies public files, including direct `astro dev/build`.
      await synchronizeQueued(config);
    },
    configureServer(server) {
      let timer;
      let closed = false;
      const update = (_event, path) => {
        if (!inside(custom, resolve(path))) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          synchronizeQueued(config)
            .then(changes => {
              if (changes && !closed)
                server.ws.send({ type: "full-reload", path: "*" });
            })
            .catch(error => {
              config.logger.error(`[jspaint] ${error.stack ?? error}`);
              if (!closed)
                server.ws.send({
                  type: "error",
                  err: { message: error.message, stack: error.stack },
                });
            });
        }, 80);
      };
      server.watcher.add(custom);
      server.watcher.on("all", update);
      cleanup = () => {
        closed = true;
        clearTimeout(timer);
        server.watcher.off("all", update);
      };
      server.httpServer?.once("close", cleanup);
    },
    closeBundle() {
      cleanup?.();
    },
    handleHotUpdate(context) {
      // Refresh only after the custom source has been synchronized, not midway through copying.
      if (inside(custom, context.file) || inside(output, context.file))
        return [];
    },
  };
}
