---
title: 使用 Cloudflare Pages 重定向修复过去的文章链接
pubDatetime: 2024-07-24T09:00:00.000+08:00
tags:
  - 博客
  - Cloudflare
  - 重定向
description: Cloudflare Redirects 和 Pages Redirect 使用心得
---

## 背景

前两篇文章 [吹水铺重新开业](/posts/202407-renew-blog-again/) 中提到了我的博客经历了一次又一次重建，
很多内容并没有完整地迁移到新的数据上，即便迁移过来了，链接格式也因为框架和配置原因发生了变化。

这就导致了很多在其他站点上引用到我的博客原文的链接，基本都已经失效了，即使文章重新迁移了过来。

于是我打算尽可能修复这些链接，由于这次博客搭建在 Cloudflare Pages 服务上，因此讲解的是如何使用
Cloudflare 产品去重定向修复过去的文章链接。

Issue：<https://github.com/fython/blog-re2024/issues/6>

### 前提条件

- 域名**需要托管在 Cloudflare DNS** 上
- 站点**需要托管在 Cloudflare Pages** 上

不满足以上条件的场景不适用本文。

## 域名重定向

你能看到这一篇文章，说明你已经进入了 `feng.moe` 这个域名。

为了更加简短好记，我是直接使用了二级域名替代这些域名：

- `www.feng.moe`
- `blog.feng.moe`

考虑到过去曾使用过 `blog.feng.moe` 以及覆盖到常用三级域名提高到达率，需要对这两个三级域名设置重定向。

### Single Redirects

从 Cloudflare 域名面板中找到 规则 - 重定向规则：

![面板首页](https://blogfiles.feng.moe/images/202407-cf-pages-redirects/single-redirects-home.jpg)

创建新规则，根据需求设置请求匹配规则：

- 主机名 等于 `www.feng.moe`
- 主机名 等于 `blog.feng.moe`

![规则展示图](https://blogfiles.feng.moe/images/202407-cf-pages-redirects/single-redirects-rule-details.jpg)

由于我希望保留 URL 中的路径，选择了 **动态** 类型来使用表达式函数作为 **URL 重定向结果**，
表达式如下：

```javascript
concat("https://feng.moe", http.request.uri.path);
```

状态码选择 301/302 均可，点击保存。

你可能以为到这里就完了，尽管我们把域名托管给了 Cloudflare DNS，但是如果域名没有解析记录，
这里设置的重定向记录也是会失败的。

![DNS 解析展示](https://blogfiles.feng.moe/images/202407-cf-pages-redirects/dns-query.jpg)

在域名 DNS 面板中确认 `blog.feng.moe` 和 `www.feng.moe` 是否 **存在 A/AAAA/CNAME 解析记录**，并且代理状态为 **“已代理”**

![DNS 解析记录设置](https://blogfiles.feng.moe/images/202407-cf-pages-redirects/dns-records.jpg)

由于我们并不打算在被跳转的域名上部署实际的内容，通常希望解析记录没有实际意义，但参考了网上很多关于 Cloudflare
空解析的问答，一些回答声称可以填写 `192.0.2.1` 类似的非公网保留 IP 地址作为 A 记录，实测并不能正常工作。

因此我的建议是添加一个 CNAME 记录，指向博客地址就好。想要了解更多可以阅读 [官方文档](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/)

### Bulk Redirects

除了 Single Redirects，使用 Bulk Redirects 也是可行的，区别在于后者不支持文本替换操作和正则表达式，但换来了更高的规则数量限制。

对于我的博客而言，访客体验上两者几乎没有区别，使用也比较简单，这里直接抛出 [官方文档](https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/) 可以自行研究。

## 路径重定向

通常上面域名重定向所使用的 Single Redirects 以及 Bulk Redirects 产品能力也能帮我搞定路径重定向问题，
但在这之前我了解过 Cloudflare Pages 能够通过在部署目录下放置一个 `_redirects` 配置来实现根据路径的重定向规则。

对于路径重定向的需求，我希望用配置文件来代替登录 Cloudflare 控制台或者 API 来管理规则，
而且配置文件也会在我的博客 Git 仓库上公开。

Cloudflare Pages 中 Redirect 能力的介绍文档：[Redirects](https://developers.cloudflare.com/pages/configuration/redirects/)

### 配置方法

在我的 Astro 博客项目中，要想在最终部署产物（`/dist` 目录）中包含一个编译过程无关的静态文件，通常是放在项目的 `/public` 目录下。

如 [public/\_redirects 源码](https://github.com/fython/blog-re2024/blob/main/public/_redirects) 所见，里面的内容包含几行简单的规则：

```txt filename="_redirects"
/archives/52/ /posts/201905-oneplus-7-pro/
/archives/33/ /posts/201806-android-biometric-prompt-compat/
/archives/11/ /posts/201705-android-n-scoped-directory/
```

Cloudflare 定义一行为一个规则，最简单的规则只由 `source` 和 `destination` 两部分组成：

```txt
[source] [destination]
```

- `source` 为需要被重定向的原路径，支持 [通配符 (\*)](https://developers.cloudflare.com/pages/configuration/redirects/#splats) 和 [占位符](https://developers.cloudflare.com/pages/configuration/redirects/#placeholders) 来代替不固定的部分
- `destination` 为重定向到的目的路径，可以包含前面通配符和占位符所匹配到的规则，具体可看官方文档，本文只讲解最简单的用法

默认情况下，这些重定向规则都是使用 [HTTP 状态码 302](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status/302) 来进行重定向，它代表的是一个暂时的移动，
且**搜索引擎不会对资源的链接进行更新**。

> 对于博客站点重构这种情况，初步对比了几个状态码后，我认为 `301` 是更适合呈现的状态码，但在彻底弄清楚之前还没有轻举妄动，后面再研究一下写一篇文章讲解。

如果你需要 Cloudflare 帮你特殊指定一个 HTTP 状态码，可以使用这样的规则格式：

```txt
[source] [destination] [code?]
```

从官方文档的 [Advanced redirects](https://developers.cloudflare.com/pages/configuration/redirects/#advanced-redirects) 部分可见，支持的状态码是有限的范围：

- Redirects (301, 302, 303, 307, 308)
- Proxying (200)

使用 30x 部分的状态码，会返回 `Location` 请求头给浏览器，由浏览器处理接下来的重定向；使用 200 状态码，Cloudflare 会反向代理到同域名下的其它路径
（见 [Proxying](https://developers.cloudflare.com/pages/configuration/redirects/#proxying)）。

## 关于如何找到过去的文章

通过 Wayback Machine 搜索域名，可以一点点找到以前的博客文章列表，但不一定能找全；有一部分我是通过其它社区平台发布过的转载找回的。

人还是要往前看，尽力找到部分过去的文章到足够的程度，丢失的部分就用新的文章去填补上吧。
