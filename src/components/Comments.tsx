import * as React from "react";
import { useEffect } from "react";
import Giscus from "@giscus/react";

const id = "inject-comments";

// 获取 localStorage 中 theme 的值
function getSavedTheme(): string {
  return window.localStorage.getItem("theme") || "light";
}

// 获取系统主题
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const Comments = () => {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState("light");

  React.useEffect(() => {
    const theme = getSavedTheme() || getSystemTheme();
    setTheme(theme);
    // 监听主题变化
    const observer = new MutationObserver(() => {
      setTheme(getSavedTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // 取消监听
    return () => {
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [themeUrl, setThemeUrl] = React.useState<string>();
  useEffect(() => {
    setThemeUrl(
      `${window.location.protocol}//${window.location.host}/giscus-${theme}.css`
    );
  }, [theme]);

  return (
    <div id={id} className="w-full">
      {mounted ? (
        <Giscus
          id={id}
          repo="fython/blog-re2024"
          repoId="R_kgDOMVGfCA"
          category="Article Comments"
          categoryId="DIC_kwDOMVGfCM4CgxlN"
          mapping="og:title"
          strict="0"
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme={themeUrl}
          lang="zh-CN"
          loading="lazy"
        />
      ) : null}
    </div>
  );
};

export default Comments;
