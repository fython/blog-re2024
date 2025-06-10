---
title: 网页分享与 Open Graph
pubDatetime: 2024-07-28T09:11:00.000+08:00
tags:
  - 网页
  - 分享
  - Open Graph
  - 技术
  - HTML
description: 讲讲社交平台们都做了哪些工作来优化网页 URL 的分享体验
---

## 前言

试试把 [https://ogp.me](https://ogp.me) 贴到 Twitter、Telegram 的输入框，会发生什么？

![Twitter Demo](https://blogfiles.feng.moe/images/202407-pages-share-and-open-graph/p1.png)

![Telegram Demo](https://blogfiles.feng.moe/images/202407-pages-share-and-open-graph/p2.png)

原本单调的网页 URL 下面，多了一张包含标题、信息以及图标的卡片（有时候还会更多）。

包括“烧饼吹水铺”博客，也做了类似表现的内容适配，例如了 https://feng.moe/posts/202407-renew-blog-again/ ：

![我的博客 Demo](https://blogfiles.feng.moe/images/202407-pages-share-and-open-graph/p3.png)

这是怎么做到的呢？

## HTML 规范

首先，我们很容易就能联想到搜索 SEO 优化中，我们一直以来都会在 HTML 的 `<head>` 标签内编写 `<title>` 标题和一些 `<meta>`
元数据，用来描述当前页面的内容：

```html
<meta name="author" content="Siubeng" />
<meta
  name="description"
  content="The <meta> element can be used to provide document metadata in terms of name-value pairs, with the name attribute giving the metadata name, and the content attribute giving the value."
/>
<meta name="keywords" content="html, css, javascript" />
```

MDN Web Docs 这篇[文档](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name)中介绍了 HTML 规范中标准的
metadata 名称的具体用法，例如上面示例代码：

- author 表示文档/页面作者
- description 表示页面内容精确简短的描述，搜索引擎可能会将其作为搜索结果展示的一部分
- keywords 表示页面内容的关键词，使用半角逗号分隔多个关键词

> 值得一提的是，通常这些都会在 SEO 优化起到关键的作用，但现今 Google 表示 keywords 已经不再影响搜索结果：
>
> 过去 keywords 可能会指导搜索引擎如何生成结果，Google 现在表示 “`<meta name="keywords" content="...">` 该元关键字标记不会用于
> Google 搜索，完全不会影响索引编制和排名。”
>
> ——《[Google 支持的 meta 标记和属性](https://developers.google.com/search/docs/crawling-indexing/special-tags?hl=zh-cn#unsupported-tags-and-attributes)》

但这些 HTML 规范中并不包含前言中提到的封面信息传递的方式，除此以外一些链接还可能提供给社交平台主体内容的视频、音频等多媒体在他们的页面中直接访问，这里就要开始介绍
Open Graph 了。

## Open Graph 规范

Open Graph 协议（以下**简称 OG**）最早是由曾经的社交平台巨头 Facebook（现 Meta）提出，目的就是让网页 URL
在社交平台展示时，一并展示出其主体内容的标题、描述、多媒体预览等信息。

官方文档：https://ogp.me/

### 基本定义

OG 协议和 HTML 规范定义的元数据（metadata）类似，也是通过在 HTML 的 `<head>` 元素中加入各种 `<meta>` 标签来描述信息，区别在于它们使用的
Key 和格式要求不同，基本的 OG 元数据有：

- `og:title` ：内容标题
- `og:type` ：内容类型，选择一个[规范定义](https://ogp.me/#types)的枚举表示是视频、音乐或是一篇文章等
- `og:image` ：内容图像/封面
- `og:url`：访问这个内容的标准 URL，不包含非内容相关的上下文参数（例如分享传播中携带的来源参数不应该包含在内）

包含 Open Graph 信息的 HTML 示例：

```html
<html prefix="og: https://ogp.me/ns#">
  <head>
    <title>The Rock (1996)</title>
    <meta property="og:title" content="The Rock" />
    <meta property="og:type" content="video.movie" />
    <meta property="og:url" content="https://www.imdb.com/title/tt0117500/" />
    <meta
      property="og:image"
      content="https://ia.media-imdb.com/images/rock.jpg"
    />
    ...
  </head>
  ...
</html>
```

还有一些比较常用的元数据有：

- `og:description` ：内容简短描述
- `og:audio` ：内容音频 URL
- `og:video` ：内容视频 URL
- `og:site_name` ：网页站点名称
- `og:locale` ：内容语言

像 `og:image` 和 `og:video` 这类多媒体元数据，协议还允许定义详细信息、同时传递多个，在支持比较完善的社交平台会得到更好的展示效果：

```html
<meta property="og:image" content="https://example.com/rock.jpg" />
<meta property="og:image:width" content="300" />
<meta property="og:image:height" content="300" />
<meta property="og:image" content="https://example.com/rock2.jpg" />
<meta property="og:image" content="https://example.com/rock3.jpg" />
<meta property="og:image:height" content="1000" />
```

### 支持情况

大部分流行的博客框架、静态网页生成框架都对 OG 协议有较好的支持；如果网站是由自己开发，就可能需要自己在生成 HTML
时实现对应的元数据标签了。

无论是哪一种方式实现，最终我们都是需要在主流的社交平台上呈现，Facebook 官方和其它公司都提供了在线检查工具帮助你确认实现是否正确：

- [Facebook](https://developers.facebook.com/tools/debug/)（需要登录）
- [Line](https://poker.line.naver.jp/)
- [Google](https://developers.google.com/search/docs/appearance/structured-data)
- [Twitter](https://cards-dev.twitter.com/validator)（已废弃，官方推荐直接使用 Twitter
  客户端验证，[说明](https://devcommunity.x.com/t/card-validator-preview-removal/175006)）

### 与 SEO 的关系

从 Google 搜索官方文档来看，OG 从来没有提过会作为 SEO 优化的一个要素，但在基本的 SEO 优化之余做好 OG
适配，在社交网络中会更有利于曝光和传播，最终和我们做传统 SEO 优化的目的也是一致的。

## 适配 OG 的利与弊

### 好处

- 鼓励分享：即便用户在社交平台贴文中没有概括链接中的内容或附上图片，也能自动解析 URL，降低用户分享成本，产生更多的分享行为；
- 用户体验：由社交平台统一展示标题、描述和封面等信息，提供良好的阅读体验；
- 提高转化率（一些情况下反而是弊端，见后文）；

### 坏处

- 隐私安全：一些糟糕的客户端实现可能会使用本地请求解析，存在一定 IP 泄露隐私的风险；
- 内容规范性：由于社交平台信任通过 OG 提供的网页封面/图片，一些 CMS、购物网站就会通过动态生成封面去分发更多的内容，社交平台需要考虑这些内容是否符合产品的期望
- 转化率：内容过于丰富，例如社交平台 A 的贴文发到平台 B 上，无需点击 URL 即可阅读完整内容，对于流量转化来说反而是一个弊端，用户无法得到平台
  A 上的其它产品引导和功能（例如广告、运营活动）；

## 扩展阅读

### OG 的前辈们

> The Open Graph protocol was originally created at Facebook and is inspired by Dublin Core, link-rel canonical,
> Microformats, and RDFa.

在文档页尾的声明中，提及了 OG 的设计受到了几个设计的启发，它们在互联网诞生早期就已经有了类似的方案，其中 W3C 组织提出的
**Resource Description Framework (RDF)**，旨在提供通用的方法去提供描述和交换图信息，早在 2004 年就推出了 1.0 版本规范。

其中 RDFa 部分规范可以被作为 HTML/XHTML 等文档格式的内容嵌入在里面，主要约定了标签语法各个属性的用途，
就包含了上面 OG 规范提到 `<meta>` 语法的 `property` 和 `content` 属性。

至于标题、描述、作者则没有包括在内，而是有不同组织在 RDF 基础上补充了 property
属性可使用的标准词汇，例如 [Dublin Core](https://en.wikipedia.org/wiki/Dublin_Core)：

```html
<head>
  <meta name="DC.title" content="Services to Government" />
  <meta name="DC.date" content="1997-07" />
</head>
```

理论上在 Dublin Core 的基础上扩展，基本和 Open Graph protocol 没有太大的区别，测试了一些网站发现主流站点也几乎没有适配
Dublin Core 的基本标签。

我在 W3Techs 上找到一个实时更新的调研数据：https://w3techs.com/technologies/comparison/da-dublincore,da-opengraph ，即便是
Top 1000 排名的网站也仅有其 2.6% 的网站使用

![调研数据](https://blogfiles.feng.moe/images/202407-pages-share-and-open-graph/p4.png)

从多个地方搜集的信息来看，Dublin Core 对网站 SEO 和分享体验优化已经几乎没有帮助，现代的 OG 显然是更好的接班人。

### Telegram Instant View

Telegram 也对聊天流中网页 URL 做了一个很有趣的分享能力叫 [Instant View](https://instantview.telegram.org/)

![Instant View](https://blogfiles.feng.moe/images/202407-pages-share-and-open-graph/p5.png)

除了和 OG 一样统一提供标题、描述和封面，还提供了快速加载的阅读界面，比起前面提到的那些元数据规范，它更接近 Google
主导的 [AMP](https://en.wikipedia.org/wiki/Accelerated_Mobile_Pages) 的能力。

有意思的是，Telegram 宣称：

> And the best part is that webmasters don't need to change anything on their websites for Instant Views to work.

他们不需要网页开发者在代码中特殊适配，通过在线的 Instant View Editor 可以对任意网站进行适配（即使网站的所有者不是你），只需要你有一些基本的
HTML/CSS 知识。

### 微信分享

微信对第三方站点的 HTML 原生语法和 Open Graph 均不支持，普通的聊天输入交互也不支持有已经接入了官方 SDK 网站从用户输入的原始
URL 自动转换为丰富的网页卡片。 值得一提的是，iOS 中 Safari 原生的分享功能会将网页中的 Open Graph
信息顺利带到微信分享中，最终发送出一个卡片形态的消息。

对于需要支持微信内置浏览器分享页面到聊天或朋友圈的场景，则需要接入官方的 [JS-SDK](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html)，
这一点是比较麻烦的，为了保证 SDK 密钥不外泄，你还需要准备一个服务端提供接口生成一次性签名。

综合时间收益考虑，我放弃了个人博客对微信分享的适配，也许会用公众号代替分发文章。
