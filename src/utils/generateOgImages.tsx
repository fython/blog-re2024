import satori, { type SatoriOptions } from "satori";
import { Resvg } from "@resvg/resvg-js";
import { type CollectionEntry } from "astro:content";
import postOgImage from "./og-templates/post";
import siteOgImage from "./og-templates/site";
import * as fs from "fs/promises";

const fetchFonts = async () => {
  const fontRegular: ArrayBuffer = await fs.readFile(
    "./fonts/SourceHanSerifSC-Regular.otf"
  );
  const fontBold: ArrayBuffer = await fs.readFile(
    "./fonts/SourceHanSerifSC-Bold.otf"
  );
  return { fontRegular, fontBold };
};

const { fontRegular, fontBold } = await fetchFonts();

const options: SatoriOptions = {
  width: 1200,
  height: 630,
  embedFont: true,
  fonts: [
    {
      name: "Source Han Serif SC",
      data: fontRegular,
      weight: 400,
      style: "normal",
    },
    {
      name: "Source Han Serif SC",
      data: fontBold,
      weight: 600,
      style: "normal",
    },
  ],
};

function svgBufferToPngBuffer(svg: string) {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateOgImageForPost(post: CollectionEntry<"blog">) {
  const svg = await satori(postOgImage(post), options);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite() {
  const svg = await satori(siteOgImage(), options);
  return svgBufferToPngBuffer(svg);
}
