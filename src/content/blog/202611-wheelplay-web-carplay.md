---
title: 曲线救国让各种智能车机用上 CarPlay 的技术总结
pubDatetime: 2026-11-16T00:00:00.000+08:00
tags:
  - Web
  - CarPlay
  - 汽车
  - 智能化
  - WheelPlay
description: 一台 Android 设备 + WheelPlay App 玩转 CarPlay
featured: true
---

> 这是一篇技术总结文章，如果你想了解如何使用 WheelPlay，请移步到下方链接的官方网站

官方网站 & 使用指引：<https://wheelplay.gwo.app/>

GitHub: <https://github.com/fython/wheelplay>

# 背景

汽车中控车机不够好用是一个老生常谈的话题，日常使用上我对我的蔚来 et5t（后面统一缩写为 NIO）说得上是满意，尽管语音助手 NOMI 真的很笨，但是日常地图导航和音乐的体验是过关的，就是车机没有 Spotify 和 YouTube Music 这种海外音乐软件，所以总是会期待能用上 CarPlay。毕竟 NIO 官方都适配了 Apple Car Key，已经交过「苹果税」了，成本应该不是大问题呀。

原本的计划是打算自己找一个 ARM 盒子，接市面上现成的 CarPlay 转换适配器，然后再转换成一个 HTTP/Web 服务，最后通过车机浏览器在同一个局域网内访问这个服务，来实现 NIO 车机上使用 CarPlay 的能力。
然而，在我正准备十一长假开始动手前，忽然发现了 **DiPlay** 这个项目 (<https://shihabal3amri.github.io/DiPlay/>)，按照作者和社区的使用方法是，把这个 App 安装在车机上，然后就可以通过蓝牙配对 + Wi-Fi Direct（或 USB 有线连接）复刻苹果的 iAP2 协议，从而让车机可以使用 iPhone 上的 CarPlay 功能。这让我非常振奋，因为它不依赖专门的 MFi 认证硬件或者转换器，只要 Android 设备网络硬件满足条件，性能过得去，就可以当作一个软适配器了。

我们看社区上主要的用户是 BYD 车机用户，而我的 NIO 车机并没有足够的自由度通过 adb sideload 去安装第三方应用，幸运的是，之前我的计划中已经计划通过 NIO 自带的浏览器来实现这个功能，果断掏出 Codex 基于 DiPlay 的项目 vibe coding 出我的 Web 中转版本的实现！

# 技术方案

<img src="/images/wheelplay-architecture.svg" alt="基本架构" width="512" />

这里我挑部分我认为比较有意思且重要的部分亲手编写，功能主路径上当然也有很多重要的组成（比如浏览器与手机配对），
就不一一细说了，现在 AI 总结效果很高，而且还能一问一答。

## CarPlay 协议

CarPlay 接收端的实现是基于苹果的 iAP2 私有协议，在封闭的 MFi 认证体系内，但社区上早有很多 AirPlay 等第三方实现，
他们帮助了很多第三方硬件能够以更低成本去接入到苹果生态，让第三方显示器、投影仪、音箱也能做成接受端，
当然市面上大部分还是经过苹果 MFi 认证的硬件，这里不多赘述。

CarPlay 和普通的 AirPlay 不同，它不是 iPhone 的直接镜像，需要由车机接收端定义显示内容的布局、分辨率和交互方式。
苹果开发者文档也有给出： <https://developer.apple.com/videos/play/wwdc2016/722/>

把整个系统拆开，可以看到几条同时工作的通道：

- 视频：CarPlay 界面的编码画面
- 音频：音乐、导航提示、语音交互等
- 麦克风：接收端采集并回传的声音
- 输入与控制：触控、旋钮、按键、会话控制
- 元数据：当前播放内容、通话或导航信息等

这些通道有不同的生命周期和实时性要求。音乐播放正常，不代表视频链路一定正常；收到画面，也不代表输入通道已经可以使用。

读 CarPlay 相关代码时，最常遇到的两个名字是 iAP2 和 AirPlay。

iAP2 是 iPhone 与配件通信的一套协议。在 WheelPlay 中，它参与配件身份与能力交换、认证相关交互、CarPlay 连接控制，以及部分元数据传输。

例如，手机需要知道对端是什么设备、支持什么功能，以及接下来应该怎样建立连接。当前播放歌曲、封面和部分车辆相关信息，也可以通过这类配件通信通道交换。

AirPlay 则承担了项目中另一组关键工作：配对验证、媒体能力查询、音视频流协商，以及事件通道和媒体传输。

因此，不能简单把它们划成「iAP2 只负责连接，AirPlay 只负责视频」。两者在会话中有配合关系，iAP2 消息也可以通过建立后的网络隧道继续传输。

### 为何不依赖额外硬件

最初打算买个 CarPlay 盒子，是因为一台 Android 设备即使能连上 iPhone、能解码视频，也还得向 iPhone 证明自己的配件身份。

按苹果公开的 MFi 认证流程，配件先出示证书，iPhone 验证后发来一次随机挑战，配件再用对应的私钥签名。证书可以公开，签名才证明对端持有私钥。传统方案把这项工作交给专用认证芯片，原厂车机可以在机内集成，而给普通 Android 设备后装 CarPlay 时，外接盒子就是补上这部分能力的一种办法。

早期的 xcertplay 甚至支持直接连接认证芯片，让 Android 负责其余协议和音视频处理。[Apple 对配件认证的说明](https://support.apple.com/zh-cn/guide/security/sec70a4f377d/web) · [xcertplay 的硬件接入方案](https://github.com/shihabal3amri/DiPlay/blob/main/docs/UPSTREAM-README.md)

DiPlay 改的是**签名在哪里完成**。这里说的「软证书」，指的是软件能使用的一套配件证书和配套私钥。DiPlay 官网所下载的预编译包，包含了最重要的软证书，使得我们在 Android 本地就能完成来自 iPhone 的认证挑战，让它接受这个配件身份（你会在界面看到写着 `CarPlay Ultra` 的字样），最终在没有外接认证芯片的情况下继续完成后面的协议。据作者说明，这个软证书来自已有配件，并非苹果专门为 DiPlay 签发，本文不做深入研究。

### 无线 CarPlay 连接实现

最常见的使用方式是无线 CarPlay，通常会同时涉及蓝牙和 Wi-Fi，但两者分工不同。

蓝牙主要用于初始发现和连接引导。接收端与 iPhone 交换必要信息，让手机知道要加入哪个无线网络，以及怎样继续建立 CarPlay 会话。

真正需要持续传输的画面和音频，则使用带宽更充足的 Wi-Fi。Apple 公开描述的典型流程中，网络凭据经蓝牙交换，随后 CarPlay 通信切换到 Wi-Fi。可见苹果官方文档 [无线 CarPlay 连接流程](https://developer.apple.com/videos/play/wwdc2016/722/?time=1557)

在 WheelPlay 中，无线连接还涉及热点或 Wi-Fi 网络的准备、Bonjour 服务发现，以及后续 AirPlay 会话建立。部分 iAP2 通信会在网络隧道就绪后继续运行。

这也解释了为什么「蓝牙已经配对成功」和「无线 CarPlay 可以显示」之间，仍然可能隔着好几个失败点：

- 手机是否成功加入无线网络。
- 双方能否发现、访问对应服务。
- 配件通信是否完成切换。
- 媒体会话是否建立成功。

只看到蓝牙连接状态，很难判断整个 CarPlay 会话已经走到了哪一步。

### 从认证到音视频传输

网络连接建立后，iPhone 和接收端还需要完成认证、配对和能力协商，才会真正开始传输画面。

WheelPlay 通过 AirPlay 控制会话处理这些交互。控制消息采用 RTSP 风格的请求与响应，部分数据使用 binary plist 编码。接收端通过 /info 声明显示和输入能力，通过 SETUP 协商媒体参数和端口，再配合其他会话操作启动或结束传输。项目中的认证和配对入口包括 `/auth-setup`、`/pair-setup`、`/pair-verify`，具体流程取决于连接状态，并不是一套固定顺序的登录接口。

协商完成后，音视频通过各自的通道传输：

- 视频：接收 H.264 或双方支持的 HEVC 编码数据，处理编码配置、解密和时间戳，再交给媒体输出层。压缩视频存在帧间依赖，重连时可能需要等待关键帧，不能收到任意一帧就立即恢复显示。
- 音频：按协商结果接收并处理声音。音乐、导航提示和语音交互可能有不同的流与播放需求，需要分别管理。
- 麦克风：方向与播放相反，由接收端采集声音，按约定格式打包后回传给 iPhone。

双方还会交换计时信息，配合媒体时间戳和本地缓冲安排播放。对 WheelPlay 来说，完成这一步才算把 CarPlay 的媒体数据接进来；之后选择 Android 本地播放、WebRTC 转发，还是 JPEG／WebP 图像输出，属于面向浏览器的下一段链路。

以无线连接为例，顺着时间往下看。图里假设车机浏览器已经和 WheelPlay 配好对。iPhone 加入 Wi-Fi 后，认证和能力查询可能穿插进行；各路媒体流也可以分次协商。图中把它们按用途放在一起。

<img src="/images/wheelplay-carplay-sequence.svg" alt="无线 CarPlay 时序图" width="528" />

## 解决行车过程 `<video>` 标签无法正常使用问题

NIO 车机在行车过程中不会暂停 `<video>` 标签的播放，但是会遮挡 `<video>` 标签的显示区域，导致视频无法正常观看。
如果用最基础的 JPEG 或 PNG 图片来做视频帧的渲染，虽然可以绕过遮挡，但是会导致视频播放不流畅，体验很差。

我做了一个猜测：NIO 车机浏览器的遮挡实现是一个简单的 **HTML DOM 元素** 或 **CSS 样式实现** ，而不是在解码器层面做的遮挡。

那么把 `<video>` 隐藏起来，仍然用它作为一个标准的视频解码组件，但是把视频帧渲染到 `<canvas>` 上，然后把 `<canvas>` 显示出来，就可以绕过遮挡了。

方案实现之后，在我的 NIO 车机上效果不错，和直接原生 Video 播放的帧数相差无几，
尽管同样无法稳定 60FPS，但这不是我当下最关心的，我要让它至少能用，瓶颈应该还落在其它地方。

在 WheelPlay 发出来给大家一起用时，理想 L6 的朋友给我反馈了他的浏览器甚至会暂停 `<video>` 标签的播放，
这个问题是我最担心的，但所幸 Web 标准还有不同的解决方案，他也加入开发，尝试 `MediaStreamTrackProcessor` 的方案，
完全不依赖 `<video>` 标签，在 JS 中读取浏览器已解码的视频帧并绘制到 Canvas，最终也成功绕过了遮挡问题。

最终对视频流渲染提供了以下三种方案（名字是暂定的，请看后面的技术方案理解）：

- 原生 Video：浏览器最基本最简单的显示视频方式
- 兼容 Canvas：通过隐藏 `<video>` 标签解码视频帧，然后渲染到可见的 `<canvas>` 上显示
- 直接 Canvas：通过 `MediaStreamTrackProcessor` 读取 `VideoFrame`，然后渲染到可见的 `<canvas>` 上显示，不依赖 `<video>` 标签

当然，WheelPlay 还实现了一个图片流传输的方案，让 Android 设备和车机之间直接传输 JPG/WebP 图片，用 image/canvas 来显示，
流畅度很差，但可以作为一个 fallback 方案，保证在任何情况下都能用。

<img src="/images/wheelplay-display-path.svg" alt="从 WheelPlay 服务端到车机屏幕的两条画面链路。WebRTC 传压缩视频，由浏览器解码；WebSocket 传 Android 端生成的 JPEG 或 WebP 图片。" width="640" />

以 CarPlay 为例，选上面三种渲染方式中的任何一种，WebRTC 传到车机的都是同一条视频轨。区别在画面到达浏览器以后：原生 Video 直接显示，另外两种把已经解码的帧画到 Canvas 上。切到图片流时，变化才发生在 Android 端：WheelPlay 先解码视频，再把画面逐张压成 JPEG 或 WebP，通过 WebSocket 发给车机。[服务端实现](https://github.com/fython/wheelplay/blob/077c86decc1b2b2ab90190805beee8003b37c300/common/src/main/java/com/shilapi/xcertplay/web/LanWebServer.kt) · [浏览器渲染代码](https://github.com/fython/wheelplay/blob/077c86decc1b2b2ab90190805beee8003b37c300/common/src/main/assets/web/app.js#L576)

## 解决 Tesla/Zeekr 车机屏蔽私有网络问题

普通局域网应用通常不需要考虑太多：手机开热点，车机连接热点，再打开手机的 IP 地址，就能访问运行在手机上的网页。

但部分车机浏览器会限制访问私有网络地址。即使两台设备已经连在同一个网络里，`http://192.168.x.x:8080` 这样的地址仍然可能打不开。

这类问题还不能一概归为 CORS。地址导航限制、网页跨源请求、HTTPS 混合内容和浏览器的本地网络访问权限，是不同层面的机制。
能理解原厂车机技术侧想要防止用户主动或是被动通过访问本地任意服务，对车机系统尝试漏洞攻击，直接一刀切限制了。

如果我们通过一个自主控制的 Wi-Fi 热点，劫持网络路由，那就可以欺骗车机访问公网 IP 而实际路由到的是自己的本地设备。

### 免 Root 方案：借助 VPN 接口保留本地地址

首先，我们需要了解 Android [VpnService](https://developer.android.com/develop/connectivity/vpn) 的基本用法，再研究如何修改路由。

现在大部分用户都不会去折腾手机 Root，而且难度也比较大，没有 Root 普通应用就得找 Workaround 去实现修改路由的 VPN 了，这里的方案是：先让系统创建一个带有指定地址的虚拟网卡，再尝试在切换 VPN 后保留这个地址。通常的 VPN 会用 TUN 接口接收系统交给它的 IP 包，再通过加密连接发送给远端服务器；服务器返回的数据也由应用写回 TUN。WheelPlay 用到的是创建接口的能力，并不需要连接远端服务器。

整个过程可以分成几步：

1. **声明服务并申请授权。** 应用声明继承 `VpnService` 的服务，用 `BIND_VPN_SERVICE` 权限保护，并注册 `android.net.VpnService` intent action。启动前调用 `VpnService.prepare()`；如果系统返回授权页面，就先让用户确认。Android 同一时间只有一个当前 VPN，因此这一步也会影响设备上已有的 VPN。
2. **创建第一个 TUN。** 授权后启动服务，通过 `VpnService.Builder` 配置接口地址，例如 `addAddress("6.6.6.6", 32)`，再用 `addRoute("6.6.6.6", 32)` 添加对应的单地址路由。`/32` 表示这里只指定这一个 IPv4 地址，并非把所有流量都送进 VPN。调用 `establish()` 后，系统创建接口并返回文件描述符；未获得授权或授权被撤销时，它可能返回 `null`。
3. **保留接口的句柄。** WheelPlay 保存返回的描述符，并通过 `dup()` 持有一个副本，避免在后续切换时过早释放引用。
4. **创建第二个占位 TUN。** 应用再次建立 VPN 接口，使第一个接口不再是当前活动 VPN。Android 允许新旧接口在切换期间短暂并存；WheelPlay 尝试延长旧接口及其地址的存留时间，让 `6.6.6.6` 继续作为本机服务的兼容入口。
5. **通过热点访问。** 车机连接手机热点后访问这个地址，WheelPlay 期望系统将请求投递给手机上的服务。这里还需要设备的热点转发和防火墙允许请求及响应通过，能否成功取决于具体设备。

**这两个 IPv4 TUN 都没有启动收发包线程。** 它们不负责转发互联网流量，也没有连接 VPN 服务器；这个方案依赖旧接口地址的保留和系统的本地投递行为。停用时应用需要关闭持有的描述符并清理服务；VPN 授权被撤销时也要停止使用这些资源。

这里使用了 Android VPN 切换过程中的过渡行为：[官方文档](https://developer.android.com/reference/android/net/VpnService.Builder#establish())要求应用随后关闭旧接口，并不保证长期保留旧接口有效。因此这只能作为实验方案，实际可用性受 ROM、内核和热点防火墙影响。本机还能枚举到地址，只能证明地址尚在，不能证明热点客户端的请求和响应已经双向打通。

最终 WheelPlay 同时提供了需要 Root 以及免 Root 两套方案，帮助遇到私有网络地址限制的车主在他们的车机上，成功连接到了原本只能提供局域网服务的 WheelPlay，而不依赖任何 DDNS 和公网服务，所有传输数据不出公网。

# 输入源框架和插件机制

WheelPlay 最初只有 CarPlay 一种车机互联方案，协议连接、视频输出和浏览器触控都是直接从 DiPlay 改过来的。通过 Web 浏览器提供无侵入的车机互联能力个人觉得是一个很有趣的通用方案，应该继续接入更多车机互联方案，比如 Android Auto、VNC、Android 虚拟桌面和 ICCOA CarLink 等等。但这些来源甚至不一定以同一种形式提供画面。CarPlay 和 Android Auto 更接近压缩视频流，部分 SDK 只接受宿主传入一个 `Surface`，VNC 则提供像素和脏矩形更新。除了车机和 WheelPlay 设备之间的通讯机制，后面的输入源协议都应该被做成一套通用的框架，甚至允许用户以插件 APK 的形式，安装更多的车机互联（输入源）支持，就像 Mihon 等漫画软件一样。

因此为 WheelPlay 引入了一层通用的 **Projection Source（投影输入源）框架**。每个输入源由 `ProjectionSourceProvider` 描述：它先通过 `probe()` 做无副作用的可用性检查，再由 `open()` 创建一次连接会话。会话只向上暴露通用能力和状态，例如当前是否已经就绪、最多支持几个触点、是否支持鼠标、键盘、夜间模式、音频和麦克风，以及怎样停止并确认资源已经释放。CarPlay、VNC 或某个第三方 SDK 的对象和命令码都留在各自的适配器里面，不会泄漏到浏览器这一层。

用 Kotlin 伪代码表示，宿主和输入源之间的接口大致是这样：

```kotlin
interface ProjectionSourceProvider {
    fun probe(): Availability  // 只检查可用性，连接设备留给 open()
    suspend fun open(host: ProjectionHost): ProjectionSession
}

interface ProjectionSession {
    val capabilities: SourceCapabilities  // 最大触点数、键盘支持等
    val state: StateFlow<SessionState>
    fun sendInput(event: InputEvent)      // 宿主在 READY 后才转发输入
    suspend fun stop(): StopResult        // 资源全部释放后才能报告成功
}
```

视频入口被归纳为三类：

- **Encoded Video**：输入完整的 H.264／H.265 压缩访问单元。格式兼容时可以直接交给 WebRTC，避免一次解码和重新编码；不兼容时仍可回退到本地解码后的图片链路。
- **Surface**：宿主创建一个 Android `Surface` 交给输入源或第三方 SDK 写入。当前通过离屏纹理读取后输出 JPEG／WebP，后续也可以增加硬件重编码器。
- **Framebuffer**：接收像素块、脏矩形或 CopyRect，先按顺序合成为完整 framebuffer，再把最新完整画面交给输出端，适合 VNC 一类协议。

这样，输入源负责「怎样拿到画面」，输出端负责「怎样送进浏览器」，两者可以独立演进。触控也使用内容区域内的归一化坐标和稳定的触点 ID，再由各协议适配器转换：CarPlay 映射到两个 HID 触点槽位，Android Auto 可以生成自己的 pointer action，VNC 则可以转换成鼠标按键。某个源不支持多点或键盘时，只要不声明相应能力，网页就不会错误地开放这些输入。

框架中更重要的其实不是接口，而是生命周期和资源所有权。`ProjectionRuntime` 同一时间只允许一个活动源。切换时会先关闭旧会话的输入、取消尚未释放的触点，再等待旧源真正停止视频生产者并释放 USB、Wi-Fi、麦克风等资源，之后才打开新源。所有操作都绑定到具体的会话对象，旧连接迟到的画面、触控或停止回调不能影响新连接。如果停止超时或返回失败，运行时宁愿保留资源占用并阻止继续切换，也不会假装清理成功；对于会自行修改热点、P2P 或启动 native 服务的投屏 SDK，这个约束非常重要。

## 独立 APK 插件

通用输入源解决了应用内部的协议差异，但 ICCOA CarLink 一类能力还有另一个现实问题：SDK 可能是闭源的，带有自己的 native 库、权限和固定名称的 Android Service，也不适合直接打包进 WheelPlay。于是我又在输入源框架上实现了一套窄范围的 APK 插件协议。它不是在主进程中动态加载 dex，而是让插件作为独立 Android 应用运行，通过 Binder 把一个输入源接入 WheelPlay。

我们允许 APK 可以提供多个输入源，每个输入源导出一个 Service，注册 `moe.feng.wheelplay.action.PROJECTION_SOURCE`。WheelPlay 扫描插件时会从 PackageManager 读取组件名、接口版本和设置入口。用户手动启用插件后，WheelPlay 会记下 Service 组件、APK 签名和首次安装时间。同签名升级可以接着用，换了签名或者卸载重装，就得再确认一次。

真正连接时的流程如下：

1. WheelPlay 使用明确的组件名绑定插件 Service，并携带随机会话 token、API 版本和宿主回调发起握手。
2. 插件返回画面尺寸、最大触点数、夜间模式和输入取消方式等能力；这个阶段不应启动投屏 SDK 或抢占网络资源。
3. WheelPlay 按尺寸创建 `Surface` 并传给插件，插件再自行绘制，或把它交给 ICCOA 等 SDK。
4. 插件报告 `READY` 后，浏览器触控才会通过有界的异步队列发送给插件；夜间模式也走同一条控制通道。
5. 停止时 WheelPlay 先撤销输入，再等待插件回调 `onStopped(clean=true)`。这个确认必须发生在画面生产者、协议连接和平台资源全部释放以后，不能只是调用了一次 SDK 的 `stop()`。

图中画了两种输入源各自到达浏览器的路径。插件 API v2 在握手时拿到宿主的 `Surface`，插件往里画，宿主读出画面并压成 JPEG／WebP，通过 WebSocket 发送。内置 Android Auto 则能直接交付 H.264 压缩帧。浏览器协商好兼容的视频轨后，WheelPlay 通过 WebRTC 发送这些帧，浏览器收到轨道时由 `pc.ontrack` 启动渲染。图的最后一段以插件为例，画出触控怎样回到当前会话。

<img src="/images/wheelplay-plugin-io-sequence.svg" alt="WheelPlay 四层时序图。插件写入 Surface 后由宿主通过 WebSocket 发送图片；内置 Android Auto 的 H.264 帧可通过 WebRTC 视频轨抵达浏览器。浏览器触点通过输入源框架回传到当前会话。" width="704" />

插件 AIDL 的调用全部是 `oneway`，避免 Binder 返回被 UI 线程或运行时锁同步等待；宿主侧和插件基类也都限制控制队列长度，过载时会结束会话，而不是无限堆积触控事件。每次回调还会同时检查 token 和 Binder 调用 UID，防止旧会话或其他进程冒充当前插件。对于会遗留进程单例、线程或 native 状态的 SDK，插件还可以选择在专用进程中运行：完成显式清理后，WheelPlay 会继续等待该进程的 Binder 真正死亡，再释放 Surface 和输入源资源。不过，结束进程只能回收内存，不能代替 Wi-Fi、P2P、热点等系统资源的正常清理。

目前插件 API v2 能接 `Surface` 画面，支持最多十点触控、可选的原生输入取消和夜间模式。音频、麦克风、媒体信息、编码帧／framebuffer IPC、多显示器以及桌面键鼠还没有纳入插件协议，所以它也不是一个「什么都能接」的投屏总线。插件的权限和配置由插件自己管，设置页可以单独开一个 Activity，也可以用同一个 APK 里的 ContentProvider 或者 Remote Compose 能力嵌进 WheelPlay Host UI。

这么一来，就可以让闭源 SDK 留在独立 UID 和进程内，也让 WheelPlay 在不知道协议细节的情况下，仍然复用同一套浏览器输出、触控租约、状态展示和安全切源逻辑。

# 总结

我认为到此这个项目已经做到极致了，因为始终它是一个无侵入式的方案，不需要破解车机，不需要购买专门硬件，但也意味着每次使用都会比较麻烦，它仍然需要你同时有一台 Android 和一台 iPhone，并且两台设备都需要在车机附近并消耗手机电量，体验提升空间有限。

至于为什么我不做成嵌入式版本，其实我也有想过用 Rust 重写 Core 然后支持编译成嵌入式系统可运行的组件，但我认为社区上还有很多优秀的项目足够解决同一个问题，并提供更好的体验。

我做了重复造轮子这个事情，是为了探索和好玩，但深入研究就要考虑 ROI 了。如果你在使用过程遇到各种各样的问题，也不妨在 Issues 下留下你的问题和看法，能提出 Pull Request 完善这个项目的话就更好了，能一起造福更多车友~

## 延伸阅读

WheelPlay 源码的 `docs/` 目录里还有更多[技术方案文档](https://github.com/fython/wheelplay/blob/077c86decc1b2b2ab90190805beee8003b37c300/docs/README.md)，比如：

- 视频偶尔卡住时，WheelPlay 什么时候请求关键帧，等多久才切回图片流？可以看[WebRTC 稳定性与卡顿恢复](https://github.com/fython/wheelplay/blob/077c86decc1b2b2ab90190805beee8003b37c300/docs/WEBRTC_RECOVERY.md)。
- 切回图片流后，网页会先试着解码一张 2×2 的 WebP 小图，再告诉服务端能不能发 WebP。这段协商过程写在[静态图片串流](https://github.com/fython/wheelplay/blob/077c86decc1b2b2ab90190805beee8003b37c300/docs/IMAGE_STREAM.md)里。
- 如果想用车机播放声音，或者用车机的麦克风跟 Siri 说话，[浏览器音频与麦克风](https://github.com/fython/wheelplay/blob/077c86decc1b2b2ab90190805beee8003b37c300/docs/BROWSER_AUDIO.md)讲了声音怎么走，以及为什么使用浏览器麦克风需要 HTTPS。
- 想自己接一个投屏 SDK，可以从 [APK 输入源插件](https://github.com/fython/wheelplay/blob/077c86decc1b2b2ab90190805beee8003b37c300/docs/PROJECTION_PLUGINS.md)里的示例开始，对照握手、接收 `Surface`、处理触控和停止会话的过程。

## 参考项目

- [DiPlay](https://shihabal3amri.github.io/DiPlay/)
- [xcertplay](https://github.com/shilapi/xcertplay)
