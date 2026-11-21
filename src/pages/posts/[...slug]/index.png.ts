import { createHash } from "node:crypto";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import sharp from "sharp";
import { getPostSlug } from "@/utils/getPostPaths";
import { getOgFonts } from "@/utils/ogFonts";
import config from "@/config";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
    cacheKey: createHash("sha256")
      .update(
        JSON.stringify([
          post.data.title,
          post.data.author,
          config.site.title,
          config.site.url,
        ])
      )
      .digest("hex")
      .slice(0, 16),
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
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
          padding: "52px",
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
              padding: "48px 56px",
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
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: { fontWeight: "bold" },
                        children: config.site.title,
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
                type: "p",
                props: {
                  style: {
                    margin: 0,
                    fontSize: 64,
                    fontWeight: "bold",
                    lineHeight: 1.28,
                    color: "#16191f",
                    maxHeight: "65%",
                    overflow: "hidden",
                  },
                  children: props.data.title,
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
                        children: `by ${props.data.author}`,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          color: "#1d559e",
                          fontWeight: "bold",
                        },
                        children: config.site.title,
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

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
