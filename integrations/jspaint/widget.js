import {
  open_from_image_info,
  reset_file,
  undo,
  redo,
  select_tool,
  get_tool_by_id,
} from "./src/functions.js";

const image = new Image();
image.src = new URL("./rice-cracker.svg", import.meta.url).href;
const imageReady = image.decode();

async function reset() {
  await imageReady;
  const seed = document.createElement("canvas");
  seed.width = seed.height = 224;
  const ctx = seed.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 224, 224);
  // Rasterize to a 32px sprite and quantize before adding hard-edged lighting.
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  const spriteCtx = sprite.getContext("2d");
  spriteCtx.fillStyle = "#ffffff";
  spriteCtx.fillRect(0, 0, 32, 32);
  spriteCtx.drawImage(image, 0, 0, 32, 32);
  const pixels = spriteCtx.getImageData(0, 0, 32, 32);
  const palette = [
    [255, 255, 255],
    [193, 105, 79],
    [226, 147, 134],
    [41, 47, 51],
  ];
  // Hash each dot's coordinates for irregular spray, stable across resets/reloads.
  const sprayThreshold = (x, y) => {
    let hash =
      (Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ 0x1f358) >>>
      0;
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
  };
  const highlights = [
    [255, 255, 255],
    [239, 177, 113],
    [255, 209, 166],
    [82, 94, 90],
  ];
  const shadows = [
    [255, 255, 255],
    [126, 61, 46],
    [169, 91, 73],
    [20, 26, 29],
  ];
  for (let i = 0; i < pixels.data.length; i += 4) {
    let nearest = palette[0];
    let distance = Infinity;
    for (const color of palette) {
      const difference = color.reduce(
        (sum, channel, index) => sum + (channel - pixels.data[i + index]) ** 2,
        0
      );
      if (difference < distance) {
        nearest = color;
        distance = difference;
      }
    }
    pixels.data.set(nearest, i);
  }
  spriteCtx.putImageData(pixels, 0, 0);
  // Keep the coarse silhouette, but shade at the final canvas resolution.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, 0, 0, 224, 224);
  const shaded = ctx.getImageData(0, 0, 224, 224);
  // Sample from an immutable material map so edge mixing cannot spread as we scan.
  const materials = new Uint8Array(224 * 224);
  for (let pixel = 0; pixel < materials.length; pixel++) {
    materials[pixel] = palette.findIndex(color =>
      color.every(
        (channel, index) => channel === shaded.data[pixel * 4 + index]
      )
    );
  }
  const halftonePixelSize = 2;
  const edgeSprayRadius = 6;
  for (let i = 0; i < shaded.data.length; i += 4) {
    let material = materials[i / 4];
    if (material <= 0) continue;
    const x = (i / 4) % 224;
    const y = Math.floor(i / 4 / 224);
    const dotX = Math.floor(x / halftonePixelSize);
    const dotY = Math.floor(y / halftonePixelSize);
    // Jitter material sampling around each dot: rice/seaweed edges dissolve into
    // the cracker using solid-color specks, without blurring or changing the white rim.
    const angle = sprayThreshold(dotX + 317, dotY + 911) * Math.PI * 2;
    const radius =
      Math.sqrt(sprayThreshold(dotX + 733, dotY + 157)) * edgeSprayRadius;
    const sampleX = Math.max(
      0,
      Math.min(
        223,
        Math.floor(dotX * halftonePixelSize + 1 + Math.cos(angle) * radius)
      )
    );
    const sampleY = Math.max(
      0,
      Math.min(
        223,
        Math.floor(dotY * halftonePixelSize + 1 + Math.sin(angle) * radius)
      )
    );
    const neighbor = materials[sampleY * 224 + sampleX];
    if (neighbor !== 0) material = neighbor;
    shaded.data.set(palette[material], i);
    // Sample per dot so each 2×2 cell stays a hard-edged, solid color.
    const lightX = (dotX * halftonePixelSize + halftonePixelSize / 2) / 224;
    const lightY = (dotY * halftonePixelSize + halftonePixelSize / 2) / 224;
    const lighting = (0.48 - lightY) * 1.5 + (0.5 - lightX) * 0.15;
    const threshold = sprayThreshold(dotX, dotY);
    if (Math.abs(lighting) > threshold) {
      shaded.data.set(
        lighting > 0 ? highlights[material] : shadows[material],
        i
      );
    }
  }
  ctx.putImageData(shaded, 0, 0);
  // This disposable canvas has no file to save. Reset its metadata before loading.
  reset_file();
  open_from_image_info(
    { image: seed, file_format: "image/png" },
    () => {
      select_tool(get_tool_by_id("TOOL_PENCIL"));
      document.documentElement.dataset.ready = "true";
    },
    undefined,
    true,
    true
  );
}

window.addEventListener("load", () => {
  document
    .getElementById("widget-about-close")
    .addEventListener("click", () =>
      document.getElementById("widget-about").close()
    );
  const menu = window.MenuBar({
    画布: [{ label: "重画", action: reset }],
    编辑: [
      { label: "撤销", action: undo, enabled: () => undos.length > 0 },
      { label: "重做", action: redo, enabled: () => redos.length > 0 },
    ],
    帮助: [
      {
        label: "关于与署名",
        action: () => document.getElementById("widget-about").showModal(),
      },
    ],
  });
  document.getElementById("widget-menu").append(menu.element);
  reset().catch(() => {
    document.querySelector(".widget-titlebar .window-title").textContent =
      "图案加载失败，请刷新";
  });
});
