---
title: 关于使用 CardView 开发过程中要注意的细节
pubDatetime: 2015-10-24T12:00:00.000+08:00
tags:
  - Android
  - 开发
  - UI
description: 远古文章之一
---

2014 年，随着 Google 推出了全新的设计语言 Material Design，还迎来了新的 Android 支持库 v7，其中就包含了 Material Design
设计语言中关于 Card 卡片概念的实现 —— CardView。经历了相当长的一段时间相信许多 Android
开发者都已经应用了这个控件，现在才写这篇文章可能有点晚，但对于刚刚开始使用的开发者以及其他已经使用了一段时间但做出来效果不好的同学应该能帮上点小忙。

![](../assets/201510-android-cardview-experience/p1.png)

正题开始~

## 注意不同 SDK 版本（低于 Lollipop 21）上的边距（Margin）效果

Google 在 Android Lollipop 中引入了 Material Design 设计中的阴影（Elevation）和 Z
轴位移，其目的就是突出界面中不同元素之间的层次关系。为了统一不同系统版本的视觉效果，Google 针对 SDK 21 以下的系统给
CardView 加入一个 Elevation 兼容（即 XML 中的 `app:cardElevation` 和 Java 代码中的 `setCardElevation`）。
然而，在低版本中设置了 CardElevation 之后 CardView 会自动留出空间供阴影显示，而 Lollipop 之后则需要手动设置 Margin
边距来预留空间，导致我在设置 Margin 在 Android 5.x 机器上调试好后，在 Kitkat 机器调试时发现边距非常大，严重地浪费了屏幕控件。
因此，我们需要自定义一个 dimen 作为 CardView 的 Margin 值：

1. 创建 `/res/values` 和 `/res/values-v21` 资源文件夹于项目对应 Module 目录下，
   前者放置旧版本/通用的资源文件（了解的可以跳过），后者放置 21 及更高 SDK 版本的资源文件。
2. 在 values 内的 dimen.xml 创建一个 Dimension （<dimen> 属性），随便命个名（如 xxx_card_margin）并填入数值 `0dp`。
3. 接着在 values-v21 文件夹内的 dimen.xml 创建名字相同的 Dimension，并填入你期望的预留边距（一般和 CardElevation 阴影大小相同）
4. 最后，在你布局中的 CardView 中设置 `android:layout_margin="@dimen/xxx_card_margin"`

这样依赖就解决了低版本中边距过大或者视觉效果不统一的问题了。

## 为你的 Card 添加点击效果

当使用 CardView 的场合是作为列表中的一个 Item 且直接单击 Item 有相应的操作，那么就有必要加上视觉反馈来告诉用户这个 Card
是可点击的。

（此处用其他例子代替 CardView 演示）

如果你是用了 AppCompat v7 支持库：
那么你可以直接给 CardView 加上 `android:foreground="?attr/selectableItemBackground"` 这个属性会在 Lollipop 上自动加上
Ripple 效果，在旧版本则是一个变深/变亮的效果。

如果你没使用这个支持库或者觉得这个效果在旧版本显得有点僵硬：
你可以尝试自定义一个 Drawable，和上一条一样根据不同 SDK 版本分别编写不同的效果，在此就不多介绍自定义 Drawable 的方法。

![](../assets/201510-android-cardview-experience/p2.gif)

## 让点击效果更加贴近 Material Design

上面曾提到过一个概念：Z 轴位移，即决定元素层次的深度，与 Elevation 大小相加构成实际显示的阴影深度。
在 Material Design Guidelines 中有建议卡片、按钮这类元素触摸时应当有一个浮起的效果，也就是增大 Z 轴位移（设计缘由可以参照
NovaDNG 在知乎的回答：<http://www.zhihu.com/question/27494839/answer/36865959>）

要实现这个效果并不难，我们只需要借助 Lollipop 的一个新属性 `android:stateListAnimator` （PS：这也意味着这个方法不可以用于旧版本系统）

首先，创建一个 TranslationZ 的变换动画放在 `/res/anim`，自己取一个名（如 touch_raise.xml），加入以下内容：

```xml
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:state_enabled="true" android:state_pressed="true">
        <objectAnimator
                android:duration="@android:integer/config_shortAnimTime"
                android:propertyName="translationZ"
                android:valueTo="@dimen/touch_raise"
                android:valueType="floatType"/>
    </item>
    <item>
        <objectAnimator
                android:duration="@android:integer/config_shortAnimTime"
                android:propertyName="translationZ"
                android:valueTo="0dp"
                android:valueType="floatType"/>
    </item>
</selector>
```

然后为你需要添加效果的 CardView（其他 View 同理）所在的 Layout XML 复制多一份到 `/res/layout-v21`，然后在新的那份 XML 的
CardView 中加入属性 `android:stateListAnimator="@anim/touch_raise"`。
这样，你的卡片按住时就会有浮起（阴影加深）的效果了。

## 尽量不要用作固定高度的 List Item

除了横向滚动列表和类似 Google Play 音乐中的带封面图片卡片 Item，其他地方应该尽量避免做固定高度的卡片。
举一个错误例子，我之前写的快递查询应用「水表助手」，快递卡片就是用了固定宽度（误人子弟系列）

![](../assets/201510-android-cardview-experience/p4.png)

不需要用卡片的地方也不应该使用，滥用只会让用户更快地厌倦你的界面设计。

![](../assets/201510-android-cardview-experience/p5.png)

（这个是复制自官方的错误范例）

## 低版本（低于 Lollipop）的 setElevation 不是万能的

由于缺少一些系统 API（如 RenderThread），CardView 中的 Elevation 兼容实现并不完美，和真正的实现方法还是有较大的差距（不是指效果），所以调用
setCardElevation 也不能随心所欲地传入一个 Float 型，在低版本系统使用时应当处理一下传入的数值（似乎只能是整数，碰到过错误但是没详细研究……懒癌请原谅）或加上
try-catch （不推荐）。

————————我是分割线————————

除了本文提到的五个点，CardView 还有许多需要注意的地方，在这里就不一一列举了~

对于实现 Material Design 卡片，CardView 并不是唯一的选择，也有人通过自己写 Drawable、Layout 来实现出性能更好的卡片效果，但对在这方面不擅长的同学来说
CardView 算是最好的选择，毕竟是 Google 自家的东西，在效果、兼容性方面都十分到位。
