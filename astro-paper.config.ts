import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://feng.moe/",
    title: "燒餅士多",
    description: "随手写写生活见闻与技术笔记",
    author: "烧饼 aka. Siubeng",
    profile: "https://feng.moe/about",
    ogImage: "astropaper-og.jpg",
    lang: "zh",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 5,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    {
      name: "github",
      url: "https://github.com/fython",
      linkTitle: "GitHub @fython",
    },
    {
      name: "instagram",
      url: "https://www.instagram.com/siubeng/",
      linkTitle: "Instagram @siubeng",
    },
    { name: "mail", url: "mailto:fythonx@gmail.com", linkTitle: "给我发邮件" },
    {
      name: "x",
      url: "https://x.com/s1ubeng",
      linkTitle: "Twitter/X @s1ubeng",
    },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
