---
title: 在 Windows 10 Creators Update (1703) 上使用 MacType + 思源宋体
pubDatetime: 2017-05-18T12:00:00.000+08:00
tags:
  - Windows
  - 字体
  - UI
  - 软件技巧
description: 守护低分辨率屏幕穷孩子的笑容
---

Adobe 和 Google 合作推出思源宋体后，我开始尝试在电脑上使用这款字体，发现衬线字体在界面上的表现还是很不错的，而且阅读起来很舒服，便折腾了一下
MacType 让其他软件都覆盖上思源宋体。

自 Windows 10 Creators Update 更新后，MacType 变得不稳定，容易导致软件崩溃，即便可以通过排除进程解决问题，但也不算什么好方法，因为这意味这个软件也会失去渲染效果（比如
Windows 资源管理器删除文件时的对话框会崩溃，直接排除的话影响又太大了）。

经过一番搜索，找到了一些网友在更新后第一时间整理出来的教程，在此我再编排一下，讲讲自己使用的过程步骤。

## 给 MacType 打补丁

目前直接下载得到的 MacType 还是比较旧的版本 1.20（去年九月份更新的），系统 1703 版本改动了字体渲染部分代码，直接使用旧版本
MacType 可能会遇到一些问题。我们需要借助第三方制作的 MacType
更新补丁 （[MacTypePatch](http://silight.hatenablog.jp/entry/MacTypePatch)）：

- Dropbox：<https://www.dropbox.com/s/lxbnc8rrtlwkghi/MacTypePatch_1.25.zip?dl=1>

- 直接下载：<http://silightblog.tank.jp/MacTypePatch_1.25.zip>

将包内的 DLL 全部拷贝到 MacType 根目录下，覆盖原有的文件（要记得关闭程序）。

![Unzip](https://blogfiles.feng.moe/images/201705-win10-fonts-with-mactype/p1.jpg)

然后把 `EasyHK32.dll` 和 `EasyHK64.dll` 都复制到系统盘的 `\Windows\System32` 文件夹下，64位系统则需要再复制一次到
`\Windows\SysWOW64` 的文件夹下。

最后再将压缩包内的 `win 8.1 or later` 文件夹里面的 `UserParams.ini` 复制到 MacType 根目录下，这个是打补丁后部分选项的配置文件。

## 安装思源宋体

官方下载链接：[Source Han Serif OTC ExtraLight + Light + Regular + Medium](https://github.com/adobe-fonts/source-han-serif/raw/release/OTC/SourceHanSerifOTC_EL-M.zip)
（[Github Release 分支](https://github.com/adobe-fonts/source-han-serif/tree/release)）

下载得到压缩包，将里面的字体全部安装到 `\Windows\Fonts` 下。

## 制作 MacType 思源宋体配置

从 [我的 GitHub](https://github.com/fython/MacType-SourceHanSerif)
下载现成的思源宋体配置：<https://github.com/fython/MacType-SourceHanSerif/archive/master.zip>

复制 `SourceHanSerif` 文件夹到 `%MacType%\ini\IoF` (`%MacType%` 指你的 MacType 安装目录)

## 启动

以管理员权限打开 MacType，初次启动可能会弹出向导，除了注册表加载模式仍然可能会出严重的问题，其它都比较稳定。

（不使用管理员权限也可以使用，但可能一些 UWP 应用会无法应用渲染效果）

选择我做好的思源宋体配置，就可以替换大部分字体为思源宋体了。

效果：

![网易云音乐 UWP Demo](https://blogfiles.feng.moe/images/201705-win10-fonts-with-mactype/p2.jpg)

![新闻 UWP Demo](https://blogfiles.feng.moe/images/201705-win10-fonts-with-mactype/p3.jpg)
