import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import satteriCallouts from "satteri-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";

export default defineConfig({
  site: config.site.url,
  prefetch: false,
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
  ],
  i18n: {
    locales: ["zh"],
    defaultLocale: "zh",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: satteri({
      hastPlugins: [
        satteriCallouts(),
        {
          name: "lazy-images",
          element: {
            filter: ["img"],
            visit(node, ctx) {
              if (!node.properties?.loading) {
                ctx.setProperty(node, "loading", "lazy");
              }
              if (!node.properties?.decoding) {
                ctx.setProperty(node, "decoding", "async");
              }
            },
          },
        },
      ],
    }),
    shikiConfig: {
      themes: { light: "github-light-default", dark: "nord" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: false,
    },
    ssr: {
      external: ["@iconify-json/tabler"],
    },
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    incrementalBuild: true,
  },
});
