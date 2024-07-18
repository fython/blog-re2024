---
title: 使用统一接口兼容库 BiometricPromptCompat 简化你的 Android 生物识别解锁支持
pubDatetime: 2018-06-06T12:00:00.000+08:00
tags:
  - Android
  - 开发
  - UI
description: Android 6.0 引入的新 API 之一
---

不知不觉，指纹识别解锁已经完成普及很久，当年 Google 在 Android 6.0 版本（SDK 23）方才加入统一的接口，如今已有很多应用程序适配支持了。
FingerprintManager 确实提供了非常便捷的接口供开发者，但没有统一的界面，需要应用程序各自实现自己的 UI，结果出来的效果五花八门、体验一般。

现在 Android P 为开发者们换来了更加简单的 BiometricPrompt，由系统来提供统一的界面，也为更多的生物识别传感器解锁支持提供可能（字面意思上的理解，现在使用
Biometric 一词取代了 Fingerprint），未来系统允许第三方应用面容特征解锁时，开发者亦无需再额外编写代码接入。

## 介绍 BiometricPromptCompat

源码地址：<https://github.com/fython/BiometricPromptCompat>

BiometricPromptCompat 是为兼容低版本 Android 而设计的，它的界面十分接近于原版 BiometricPrompt 以保证在不同的 Android
上有一致的效果。

当然在 Android P 或者更新的版本我们还会用原来的 BiometricPrompt
接口，尽管不能保证不同设备上的界面一致，因为系统厂商们会以他们的风格重新设计。（但没有关系，我认为系统厂商有权利统一自己的系统风格，而且不同的生物识别解锁也需要不同的界面）

我们需要意识到在 Android 6.0~8.1 版本中只有指纹传感器会被支持，很抱歉我暂时没有计划去适配成千上万系统中不相容的接口们。

## 基本需求

- Platform SDK for Android P (android-28)
- Android Studio 3.1+

## 举个例子

> 我们推荐在使用这个库前先了解 FingerprintManager 或 BiometricPrompt 的使用，所有你想知道的都可以在那找到。

首先引入依赖到你的应用 Module 中（`build.gradle`）：

```groovy
dependencies {
    implementation 'moe.feng.support.biometricprompt:library:1.0.0'
}
```

接下来通过 `BiometricPromptCompat.isHardwareDetected(Context)` 来得知硬件是否支持（会包括 Android 版本检查）。

经过确认后，才可开始构建对话框并开始认证：

```java
final BiometricPromptCompat biometricPrompt = new BiometricPromptCompat.Builder(context)
        .setTitle("标题")
        .setSubtitle("副标题")
        .setDescription("描述：吧啦吧啦吧啦吧啦吧啦……")
        .setNegativeButton("使用密码", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                Toast.makeText(
                    context,
                    "你请求了密码解锁。",
                    Toast.LENGTH_LONG).show();
            }
        })
        .build();

biometricPrompt.authenticate(cancellationSignal, myCallback);
```

## 相关链接

- [FingerprintManager 参考](https://developer.android.com/reference/android/hardware/fingerprint/FingerprintManager)
- [BiometricPrompt 参考](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt)
- [Android P Preview 改动介绍中的生物识别解锁部分说明](https://developer.android.com/preview/features/security#biometric-auth)

## 效果展示

Android 8.1

![](../assets/201806-android-biometric-prompt-compat/p1.png)

Android P Preview

![](../assets/201806-android-biometric-prompt-compat/p2.png)

## 还有……

### 支付宝、微信为何不使用统一接口？

> 以下观点仅为个人在 18 年的评论

众所周知，支付宝和微信的指纹支付功能欲为 Android
所用还需系统中置入他们的私有库并获得他们的认证方可使用，两家中国互联网巨头不约而同道如此做法是为了安全，甚有相关原理分析文章发表（[微信
SOTER](https://juejin.im/entry/59ccebdcf265da06611f929b)）。假设 Google 真的在过去留下了坑，随时时间推移他们也会发现问题存在并解决，而国内这些方案为何又不被采纳入
AOSP 中。

从某厂热门手游的 “高帧率模式支持” 一词被炒热来看，这些不兼容的接口支持，或为一种软件厂商给予硬件厂商的营销手段。

结果或好或坏，为了小部分破解获得 root 权限又不注重软件安全的用户的数据、财产安全而牺牲了所有使用非国产系统或手机的用户体验，实在划不来。国内直接使用
Android 原生接口的软件数不胜数，单是美团、招商银行就有相当大的用户量了，我们也应该放心地去使用统一接口。

### 怎样同时使用用户设定的 PIN、图案锁定作为解锁方式

早在 Android 5.0 KeyguardManager
就提供了 [createConfirmDeviceCredentialIntent](https://developer.android.com/reference/android/app/KeyguardManager#createConfirmDeviceCredentialIntent%28java.lang.CharSequence,%20java.lang.CharSequence%29)
方法可以创建一个打开系统设置认证界面的
Intent，它的解锁方式会与锁屏保持一致，使用 `startActivityForResult` 去获取结果，当结果为 `RESULT_OK` 时则通过解锁。

这是一个依赖系统设置界面的 API 用的人比较少，不确定各个国产系统上的行为表现是否稳定，使用前建议先调查可用性（尤其是 MIUI）。
