export type NavType = "posts" | "tags" | "about" | "search" | "friends";

export const NavNameMap: Record<NavType, string> = {
  posts: "文章",
  tags: "标签",
  about: "关于",
  search: "搜索",
  friends: "友情链接",
};
