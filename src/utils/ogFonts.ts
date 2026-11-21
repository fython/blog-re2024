import { readFile } from "node:fs/promises";
import type { Font } from "satori";

const OG_FONTS_KEY = Symbol.for("astro-paper.ogFonts");

const globalStore = globalThis as typeof globalThis & {
  [OG_FONTS_KEY]?: Promise<Font[]>;
};

/**
 * Loads and caches OG font buffers on `globalThis` so Satori reuses its
 * internal reference-keyed font cache across all prerendered OG routes.
 */
export function getOgFonts(): Promise<Font[]> {
  globalStore[OG_FONTS_KEY] ??= Promise.all([
    readFile("./fonts/SourceHanSerifSC-Regular.otf"),
    readFile("./fonts/SourceHanSerifSC-Bold.otf"),
  ])
    .then(([regularData, boldData]): Font[] => [
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
    ])
    .catch(error => {
      delete globalStore[OG_FONTS_KEY];
      throw error;
    });

  return globalStore[OG_FONTS_KEY];
}
