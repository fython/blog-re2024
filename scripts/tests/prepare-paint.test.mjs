import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  stat,
  rm,
  utimes,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import paintAssets from "../prepare-paint.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "paint-plugin-"));
  const put = async (path, data) => {
    const target = join(root, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, data);
  };
  const upstream = "node_modules/jspaint";
  const font = "node_modules/@fontsource/fusion-pixel-12px-proportional-sc";
  await put("package.json", "{}");
  await put(`${upstream}/package.json`, '{"name":"jspaint"}');
  await put(
    `${font}/package.json`,
    '{"name":"@fontsource/fusion-pixel-12px-proportional-sc"}'
  );
  for (const name of [
    "src/app.js",
    "styles/layout.css",
    "lib/tool.js",
    "images/classic/tools.png",
    "images/cursors/default.png",
    "images/icons/16x16.png",
    "images/transforms/skew.png",
    "help/p_tool.png",
    "localization/zh/localizations.js",
    "audio/chord.wav",
    "LICENSE.txt",
  ]) {
    await put(`${upstream}/${name}`, name);
  }
  await put(`${upstream}/src/sessions.js`, "excluded");
  await put(`${upstream}/lib/pdf.js/large.js`, "excluded");
  await put(
    `${font}/files/fusion-pixel-12px-proportional-sc-latin-400-normal.woff2`,
    "font"
  );
  await put(`${font}/LICENSE`, "font license");
  await put("integrations/jspaint/index.html", "custom entry");
  const config = {
    root,
    publicDir: join(root, "public"),
    cacheDir: join(root, "cache"),
    logger: {
      info() {},
      error(error) {
        throw new Error(error);
      },
    },
  };
  const output = name => join(config.publicDir, "vendor/jspaint", name);
  const run = () => paintAssets().configResolved(config);
  return { root, put, config, output, run };
}

test("content cache, incremental updates, removals, dependency changes and missing output", async () => {
  const f = await fixture();
  try {
    await f.run();
    assert.equal(
      await readFile(f.output("index.html"), "utf8"),
      "custom entry"
    );
    await assert.rejects(stat(f.output("src/sessions.js")), { code: "ENOENT" });
    await assert.rejects(stat(f.output("lib/pdf.js/large.js")), {
      code: "ENOENT",
    });
    const before = (await stat(f.output("src/app.js"))).mtimeMs;
    const cacheBefore = (
      await stat(join(f.config.cacheDir, "paint-assets.json"))
    ).mtimeMs;
    await f.run();
    assert.equal(
      (await stat(join(f.config.cacheDir, "paint-assets.json"))).mtimeMs,
      cacheBefore
    );
    await utimes(
      join(f.root, "integrations/jspaint/index.html"),
      new Date(),
      new Date()
    );
    await f.run();
    assert.equal(
      (await stat(join(f.config.cacheDir, "paint-assets.json"))).mtimeMs,
      cacheBefore
    );
    await f.put("integrations/jspaint/index.html", "edited");
    await f.put("integrations/jspaint/extra.txt", "added");
    await f.run();
    assert.equal(await readFile(f.output("index.html"), "utf8"), "edited");
    assert.equal((await stat(f.output("src/app.js"))).mtimeMs, before);
    await rm(join(f.root, "integrations/jspaint/extra.txt"));
    await f.run();
    await assert.rejects(stat(f.output("extra.txt")), { code: "ENOENT" });
    await f.put("node_modules/jspaint/src/app.js", "dependency edit");
    await f.run();
    assert.equal(
      await readFile(f.output("src/app.js"), "utf8"),
      "dependency edit"
    );
    await rm(f.output("fonts/fusion-pixel.woff2"));
    await f.run();
    assert.equal(
      await readFile(f.output("fonts/fusion-pixel.woff2"), "utf8"),
      "font"
    );
    await rm(join(f.config.publicDir, "vendor/jspaint"), { recursive: true });
    await Promise.all([f.run(), f.run()]);
    assert.equal(await readFile(f.output("index.html"), "utf8"), "edited");
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("dev watcher synchronizes before refresh and cleans up in middleware mode", async () => {
  const f = await fixture();
  const plugin = paintAssets();
  try {
    await plugin.configResolved(f.config);
    const watcher = new EventEmitter();
    watcher.add = () => {};
    let notify;
    const refreshed = new Promise(resolve => {
      notify = resolve;
    });
    plugin.configureServer({ watcher, ws: { send: notify } });
    await f.put("integrations/jspaint/index.html", "hot update");
    watcher.emit(
      "all",
      "change",
      join(f.root, "integrations/jspaint/index.html")
    );
    assert.deepEqual(await refreshed, { type: "full-reload", path: "*" });
    assert.equal(await readFile(f.output("index.html"), "utf8"), "hot update");
    plugin.closeBundle();
    assert.equal(watcher.listenerCount("all"), 0);
  } finally {
    plugin.closeBundle();
    await rm(f.root, { recursive: true, force: true });
  }
});
