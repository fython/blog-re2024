---
title: Android Q 的存储行为变化
pubDatetime: 2019-03-15T12:00:00.000+08:00
tags:
  - Android
  - 手机
  - 开发
  - 隐私
description: 本文最初发表于少数派 https://sspai.com/post/53287
---

> 本文最初发表于少数派 <https://sspai.com/post/53287>

与 iOS 不同，过去的 Android 一直都允许应用直接访问内部存储空间（External Storage），并不是所有开发者都能详细考虑到存储空间使用方式对用户体验的影响，尽管这些在 Android Developers 官网文档中都有提及过。

Google 在前面的版本也有一点一点地探索存储功能的改进，例如 Android 4.4 引入的存储访问框架（即 Storage Access Framework，它包括了 Documents Provider 这一利器）和对 SD 卡的访问限制；Android 7.0 增强了 Documents Provider 的接口，提供了虚拟文件的概念，并提供限定目录访问权限控制等等。然而这些改进都需要开发者认真考虑如何设计、使用这些接口，也跟解决内部存储空间脏乱现象没有直接帮助。

自欧盟颁布 GDPR 并实际应用以来，越来越多互联网企业开始意识到用户隐私的保护问题，Android 作为一个移动应用平台，也必须承担起相应的责任。Android 6.0 就已经开始收紧隐私权限，后续版本也在一点一点变化，终于在 Android Q 开始对存储功能开始作出重大更改，给予每个应用一个独立的存储沙箱，将文件数据隔离开来。

## 哪些应用会受到影响？

沙箱化后现有的存储权限申请、数据存放都必须改动，因此 Google 把 Android Q 上会被沙箱化条件设为 “目标 SDK 至少为 Q (29) 的应用或者运行 Android Q 时全新安装的应用”。

不符合这个条件的应用将会运行在兼容模式下，在兼容模式中应用行为大致和过去相同，以保证不会出现严重的数据丢失问题。其中，兼容模式在应用重新安装后会被关闭。

看到这里我比较惊讶，按照这个条件即使应用不是为 Android Q+ 设计（目标 SDK < 29）也会被沙箱化，Google 难得地采取这个强硬的态度，这可能意味着现有的文件管理类应用没有提升目标 SDK 也会受到沙箱化影响，一旦没有 Root 可能就废了。（除非升级适配到 Storage Access Framework）

## 会受到怎样的影响？

沙箱化后，应用不能再通过 Java File API 来互相访问内部存储文件数据，就像 `/data/data` 中各个应用的数据各自有一个目录存放私有数据一样，应用访问 `/sdcard` 实质上访问的是一个独立的存储空间。如果你在过去的 Android 版本中使用过 “存储重定向（Storage Redirect）” 应用，它们的效果是近似相同的。

值得注意的是，这个独立的存储空间会受到很多限制，你的媒体文件保存在里面可能不再能和其它应用共享，同时也无法通过遍历扫描来自建一个图片/音乐列表，除非通过标准的[媒体存储（MediaStore）](https://developer.android.com/reference/android/provider/MediaStore)接口来读写。如果你的应用一开始就采取这些规范的做法，即便没有及时更新目标 SDK，大部分功能也应该能正常运作。

这里就有一个疑问了，既然不能通过 Java File API 来访问别人的文件数据，那么 MediaStore 中获取的媒体地址要怎么访问，必须迁移到 ContentProvider 方式吗？过去 MediaStore 查询返回指针中的 DATA 栏对应的是媒体文件的真实存储路径，现在变成了类似 `/mnt/content/media/external/images/media/10` 这样的路径，允许拥有存储权限的应用继续通过 Java File API 访问而不必迁移到 ContentProvider 方式，保障了正确使用 MediaStore 来读取媒体的权利。

> 注1：实际使用中发现打开流时会有这样的日志 “V/ActivityThread: Redirecting /mnt/content/media/external/images/media/10 to content://media/external/images/media/10”，经过尝试所有 /mnt/content 都会被内部实现转换成 Content Uri 然后通过 ContentProvider 来打开 FD 以访问，看起来是 libcore 中实现了一个 AndroidOs 类来拦截 /mnt/content 的打开方式。）
>
> 注2：AndroidOs 类的拦截并不能对 [NIO Files API](https://developer.android.com/reference/java/nio/file/Files) 中的 UnixFileSystemProvider 有效，导致在使用 Files 类中的方法访问 /mnt/content 时会爆炸）

公共媒体数据应当通过正确的 MediaStore 接口来读写，那么其它应用数据又应该如何保存呢？首先，沙箱空间跟过去的内部存储空间内 `Android/data/包名` 的文件夹一样，会在应用卸载时被永久清除无法恢复，用户主动下载保存的文件固然不能存在沙箱空间，要想存到沙箱外面，就必须要通过 Storage Access Framework 的 [DocumentFile API](https://developer.android.com/reference/android/support/v4/provider/DocumentFile) 进行读写，不限于单个文件的一次性访问，你还可以通过这个接口持续地获得某个目录的存取权限。值得一提的是这个 API 也应该从 Android 4.4 开始就获得了支持，适配 Android Q 后可以大胆地在旧机型同时采用这种方式来访问文件（但也不要忘记在旧机型做 fallback，因为某些国产系统会阉割掉 Documents 应用导致无法请求访问）。

访问公共媒体和保留自己的文档这两个问题都解决了，接下来是如何在跨应用提供文件访问，放到最后才提并不是重头戏，反而对于认真适配了 Android 7.0 的 FileUriExposedException 的同学来说是再简单不过了，通过 Google 在支持库中提供的 [FileProvider](https://developer.android.com/reference/androidx/core/content/FileProvider)，只需要编写好 XML 转发规则，完全不必自己实现 ContentProvider 即可将自己的文件路径转换为 Content Uri 提供给其它应用使用。

## 权限的变化

传统的 `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` 读写权限已经被更加细化的权限替代了，`READ_MEDIA_IMAGES` 和 `READ_MEDIA_VIDEO` 分别对应读取图片和视频，授权是会作为一组权限同时授予，而 `READ_MEDIA_AUDIO` 读取音频权限为单独一组授予，它们会控制应用通过 MediaStore 读取媒体的能力。
如果你的应用还在请求传统的读写权限，在 Android Q 系统中会自动转换成这三个新的权限，同时请求 `WRITE_EXTERNAL_STORAGE` 对于 Android Q 上运行的应用已没有意义。就像访问自己的私有目录一样，每个沙盒空间只属于对应应用自己，只要沙盒化了无论怎么访问 /sdcard 内置存储也不影响其它应用。

Google 还没有放过媒体存储中图片的隐私位置信息，新增了一个 `ACCESS_MEDIA_LOCATION` 权限，拥有权限之后还需要调用 `MediaStore#setRequireOriginal` 方法来更新想要得到位置信息的图片 Uri，具体如何使用可以阅读 Android Developers 官方文档：<https://developer.android.com/preview/privacy/scoped-storage#photos-access-location-info>

## 哪些做法不再推荐

这里所不推荐的做法都是作者本人根据 Android Q 改动和长期以来作为用户体验所总结的，并不是 Google 官方的声明，是否采纳请自行斟酌。

### 1、应用内自建图片选择器

大多数社交应用包括海外的 Instagram 都自建了图片选择器，通过 MediaStore 查询列表将结果按照自己的设计进行分类排序显示，提供多选操作，听起来可以扩展许多功能很棒。实际上现代 Android 中 Storage Access Framework 所调用的选取界面已经可以满足几乎所有的需求，甚至支持从网络磁盘（例如 Google Drive、Google Photos 等支持 DocumentProvider 的应用）中选择照片，大幅提高用户的选图效率。尽管选图过程进行编辑还不支持，但我认为使用 SAF 带来的其它好处值得把这些放到下一步去做。

### 2、音乐播放器、视频播放器扫描存储并自建列表

沙盒化后要访问公共空间下的媒体就要通过 MediaStore 接口去查询了，应用被关在一个单独的隔离空间里面，又怎么会读得到所有音频、视频呢。当然，用户也有各自的需求，比如一些不适宜给所有拥有权限的应用读到的媒体文件被放在了标记了 `.nomedia` 的文件夹下无法通过 MediaStore 接口查询，这时候 Storage Access Framework 就派上用场了，让用户自行选择哪些数据需要被你访问到。

### 3、SDK 组件在应用间共享 IMEI 或其它唯一设备标识符

机智的 SDK 开发者为了解决不是所有应用都被授予了 `READ_PHONE_STATE` 权限，把用户的 IMEI 或者其它唯一设备标识码写到了内置存储 `/sdcard` 下，这不仅不安全，也对 Android Q 不再奏效。你可以掏出 ContentProvider 来解决硬需求，但我希望以后大家都克制地追踪、统计用户数据，而不是什么数据都拿到手上未经同意刻画出一批批用户画像。

### 4、通过 file:// Uri 来共享文件

适配 Android 7.0 时偷懒通过 StrictMode 来去掉 `FileUriExposedException` 错误，似乎 Google 自家也有应用偷懒过，现在 “惨遭” 沙箱化后绝对会出问题……也许应该分开一节 “哪些做法已失效”，好像也码不了多少字了，就丢到这里来吧。总之已弃用的方法/行为少用为妙，等到出问题了还得及时改过来。

## 一点点感叹

Android 一直以来都赋予了应用们对文件系统相当大的使用权利，造就了各式各样的文件管理器、图库和垃圾清理工具等大幅提升使用体验的应用，也遗留下了公共空间脏乱的问题。第一次阅读 Q Preview 文档时还以为 Google 又是只针对新 Target SDK 配合市场规则要求开发者及时适配，认真看才发现这次下了狠手，对所有 Target SDK 都沙盒化，非常惊讶。
去年年初开发者 `@RikkaW` 推出过 “[存储重定向（Storage Redirect）](https://sr.rikka.app/)” 应用，也正是解决相同的问题，而它适用于已 Root 的 Android 6.0+ 设备，覆盖用户群更广一些，效果与这次 Android Q 的 Isolated Storage 近似相同，但 Android Q 的做法更暴力一些，如果旧式应用没有使用标准 MediaStore 保存文件，那么用户认为已保存的重要信息可能随着应用卸载而消失。想了解更多可以自行体验，这里不作过多的推广（其实还是想打广告的~）

另外，Storage Access Framework 终于被提到了一个重要的位置，希望大家能好好使用它~
