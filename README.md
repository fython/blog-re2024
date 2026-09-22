# blog-re2024

Siubeng's Blog project based on [astro-paper](https://github.com/satnaing/astro-paper)

烧饼的个人博客，基于 [astro-paper](https://github.com/satnaing/astro-paper) 主题改造而成

根据个人偏好和使用场景作以下调整：

- 通过 Material Design 动态取色作为主题色调
- 中文本地化
- 使用思源宋体作为博客默认字体
- 引入 Giscus 作为评论系统

后续根据站点需求会继续调整，本人不对项目代码可维护性作保证，开源仅为交流学习。

## 同步上游主题

当前同步到 AstroPaper 6.1.0，上游提交 `35cfa7f`。站点配置位于
`astro-paper.config.ts`，中文界面文案位于 `src/i18n/lang/zh.ts`。

- 保留文章目录 `src/content/blog/`、友链目录 `src/content/friend/`，以及
  `src/pages/about.md`、`src/pages/projects.md`，不导入上游示例文章。
- 保留旧文章和标签链接、`public/_redirects`、Giscus 评论配置、社交链接和中文字体。
- 使用 Node.js 24 和项目指定的 pnpm；首次克隆后先运行 `git lfs pull`，补齐字体和图标。
- `pnpm install --frozen-lockfile` 后运行 `pnpm lint`、`pnpm format:check`、
  `pnpm build`；使用 `pnpm preview` 检查搜索及页面交互。

后续同步先记录当前提交，再在新分支执行 `git fetch upstream` 和
`git merge --no-commit --no-ff upstream/main`。解决冲突并构建后，可运行
`node scripts/verify-content.mjs <同步前的提交>`，核对原有内容、资源和链接。
文章及页面 Markdown 不参与主题代码格式化，避免无关改动。

## Licenses

MIT Licenses
