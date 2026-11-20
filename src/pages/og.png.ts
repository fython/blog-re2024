import type { APIRoute } from "astro";
import satori from "satori";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import config from "@/config";

export const GET: APIRoute = async () => {
  const [regularData, boldData] = await Promise.all([
    readFile("./fonts/SourceHanSerifSC-Regular.otf"),
    readFile("./fonts/SourceHanSerifSC-Bold.otf"),
  ]);

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
      fonts: [
        {
          name: "Source Han Serif SC",
          data: regularData,
          weight: 400,
          style: "normal",
        },
        {
          name: "Source Han Serif SC",
          data: boldData,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
