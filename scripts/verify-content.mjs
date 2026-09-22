import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import kebabcase from "lodash.kebabcase";

const reference = process.argv[2];
assert(reference, "Usage: node scripts/verify-content.mjs <pre-sync Git ref>");
const git = (...args) => execFileSync("git", args);
const paths = git(
  "ls-tree",
  "-r",
  "--name-only",
  reference,
  "src/content",
  "public",
  "fonts",
  "src/pages/about.md",
  "src/pages/projects.md"
)
  .toString()
  .trim()
  .split("\n");
let articles = 0;
let published = 0;
let friends = 0;
const rss = readFileSync("dist/rss.xml", "utf8");
for (const path of paths) {
  const before = git("show", `${reference}:${path}`);
  assert(existsSync(path), `Missing source: ${path}`);
  const after = readFileSync(path);
  if (
    before.toString().startsWith("version https://git-lfs.github.com/spec/v1")
  ) {
    const oid = before.toString().match(/oid sha256:(\w+)/)[1];
    assert.equal(
      createHash("sha256").update(after).digest("hex"),
      oid,
      `LFS data changed: ${path}`
    );
  } else {
    assert(before.equals(after), `Source changed: ${path}`);
  }
  if (path.startsWith("src/content/friend/")) friends++;
  if (!path.startsWith("src/content/blog/") || !path.endsWith(".md")) continue;
  articles++;
  const data = parse(after.toString().split(/^---\s*$/m)[1]);
  if (
    data.draft ||
    new Date(data.pubDatetime).getTime() > Date.now() + 15 * 60 * 1000
  )
    continue;
  published++;
  const slug = path
    .slice("src/content/blog/".length, -3)
    .split("/")
    .filter(part => !part.startsWith("_"))
    .map((part, index, parts) =>
      index === parts.length - 1 ? part : kebabcase(part)
    )
    .join("/");
  const html = readFileSync(`dist/posts/${slug}/index.html`, "utf8");
  assert(html.includes('id="article"'), `Missing article body: ${slug}`);
  assert(html.includes('id="inject-comments"'), `Missing comments: ${slug}`);
  assert(rss.includes(`/posts/${slug}`), `Missing RSS entry: ${slug}`);
  for (const tag of data.tags ?? []) {
    assert(
      existsSync(`dist/tags/${kebabcase(tag)}/index.html`),
      `Old tag URL missing: ${tag}`
    );
  }
}
for (const route of [
  "about",
  "projects",
  "friends",
  "posts",
  "tags",
  "archives",
  "search",
]) {
  assert(existsSync(`dist/${route}/index.html`), `Missing page: ${route}`);
}
for (const line of readFileSync("public/_redirects", "utf8")
  .trim()
  .split("\n")) {
  const target = line.trim().split(/\s+/)[1];
  assert(
    existsSync(`dist${target}index.html`),
    `Broken legacy redirect: ${line}`
  );
}
assert.equal(
  (rss.match(/<item>/g) ?? []).length,
  published,
  "Unexpected RSS articles (check drafts or template posts)"
);
process.stdout.write(
  `Verified ${articles} articles, ${friends} friends, page sources, static assets, old article/tag URLs, RSS and legacy redirects against ${reference}.\n`
);
