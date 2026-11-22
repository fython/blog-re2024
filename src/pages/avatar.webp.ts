import type { APIRoute } from "astro";
import { getGravatarAvatar } from "@/utils/getGravatarAvatar";

const PROFILE_EMAIL = "fythonx@gmail.com";

export const GET: APIRoute = async () => {
  const { buffer } = await getGravatarAvatar(PROFILE_EMAIL);
  if (!buffer) {
    return new Response("Avatar unavailable", { status: 404 });
  }
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/webp" },
  });
};
