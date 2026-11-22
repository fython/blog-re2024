import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getAssetPath } from "@/utils/withBase";

const GRAVATAR_CACHE_DIR = "node_modules/.astro/gravatar-cache";
const FETCH_TIMEOUT_MS = 8000;
const AVATAR_SIZE = 320;
const WEBP_QUALITY = 85;

export interface GravatarAvatar {
  buffer: Buffer | null;
  url: string;
}

const avatarPromises = new Map<string, Promise<GravatarAvatar>>();

function buildResult(
  buffer: Buffer | null,
  fallbackUrl: string
): GravatarAvatar {
  if (!buffer) {
    return { buffer: null, url: fallbackUrl };
  }
  const contentHash = createHash("sha256")
    .update(buffer)
    .digest("hex")
    .slice(0, 8);
  return {
    buffer,
    url: `${getAssetPath("avatar.webp")}?v=${contentHash}`,
  };
}

async function fetchAndCacheAvatar(email: string): Promise<GravatarAvatar> {
  const hash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
  const remoteUrl = `https://www.gravatar.com/avatar/${hash}?s=400&d=mp`;
  const fallbackCachePath = join(GRAVATAR_CACHE_DIR, `${hash}.webp`);

  try {
    const response = await fetch(remoteUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Gravatar HTTP ${response.status}`);
    }

    const raw = Buffer.from(await response.arrayBuffer());
    const webp = await sharp(raw)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    try {
      await mkdir(GRAVATAR_CACHE_DIR, { recursive: true });
      await writeFile(fallbackCachePath, webp);
    } catch {
      // Non-fatal if cache directory is read-only.
    }

    return buildResult(webp, remoteUrl);
  } catch {
    try {
      const cached = await readFile(fallbackCachePath);
      return buildResult(cached, remoteUrl);
    } catch {
      return buildResult(null, remoteUrl);
    }
  }
}

/**
 * Fetch, resize, and convert the Gravatar avatar to WebP once per build,
 * falling back to a disk copy when offline or Gravatar is unreachable.
 */
export function getGravatarAvatar(email: string): Promise<GravatarAvatar> {
  const key = email.trim().toLowerCase();
  let pending = avatarPromises.get(key);
  if (!pending) {
    pending = fetchAndCacheAvatar(key);
    avatarPromises.set(key, pending);
  }
  return pending;
}
