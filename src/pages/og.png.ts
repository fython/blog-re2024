import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { APIRoute } from "astro";
import satori from "satori";
import sharp from "sharp";
import { getOgFonts } from "@/utils/ogFonts";
import config from "@/config";

const OG_CACHE_DIR = "node_modules/.astro/og-cache";
const TEMPLATE_VERSION = "v1";
const REGULAR_FONT_PATH = "./fonts/SourceHanSerifSC-Regular.otf";
const BOLD_FONT_PATH = "./fonts/SourceHanSerifSC-Bold.otf";

export const GET: APIRoute = async () => {
  const [regularStat, boldStat] = await Promise.all([
    stat(REGULAR_FONT_PATH),
    stat(BOLD_FONT_PATH),
  ]);
  const cacheKey = createHash("sha256")
    .update(
      JSON.stringify([
        TEMPLATE_VERSION,
        config.site.title,
        config.site.description,
        config.site.author,
        config.site.url,
        regularStat.size,
        regularStat.mtimeMs,
        boldStat.size,
        boldStat.mtimeMs,
      ])
    )
    .digest("hex")
    .slice(0, 16);
  const cachePath = join(OG_CACHE_DIR, `site-${cacheKey}.png`);

  try {
    const cached = await readFile(cachePath);
    return new Response(new Uint8Array(cached), {
      headers: { "Content-Type": "image/png" },
    });
  } catch {
    // Cache miss: render and persist below.
  }

  const fonts = await getOgFonts();

  const svg = await satori(
    {
      key: null,
      type: "div",
      props: {
        style: {
          background: "#f7f8fa",
          color: "#16191f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px",
          fontFamily: "Source Han Serif SC",
        },
        children: {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: "#f7f8fa",
              border: "2px solid #dce2ea",
              borderTop: "6px solid #1d559e",
              padding: "56px 64px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 22,
                    color: "#2b6f72",
                    letterSpacing: "0.14em",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        children: "PERSONAL BLOG",
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: { color: "#5b6370" },
                        children: new URL(config.site.url).hostname,
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  },
                  children: [
                    {
                      type: "p",
                      props: {
                        style: {
                          margin: 0,
                          fontSize: 78,
                          fontWeight: "bold",
                          lineHeight: 1.2,
                          color: "#16191f",
                        },
                        children: config.site.title,
                      },
                    },
                    {
                      type: "p",
                      props: {
                        style: {
                          margin: 0,
                          fontSize: 30,
                          lineHeight: 1.5,
                          color: "#5b6370",
                        },
                        children: config.site.description,
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "2px solid #dce2ea",
                    paddingTop: "24px",
                    fontSize: 24,
                    color: "#5b6370",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        children: config.site.author,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          color: "#1d559e",
                          fontWeight: "bold",
                        },
                        children: config.site.url.replace(/\/$/, ""),
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts,
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  try {
    await mkdir(OG_CACHE_DIR, { recursive: true });
    await writeFile(cachePath, pngBuffer);
  } catch {
    // Ignore cache write errors on read-only filesystems.
  }

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
