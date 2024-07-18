---
title: 实践 Android 7.1 快捷方式新模式
pubDatetime: 2016-11-05T12:00:00.000+08:00
tags:
  - Android
  - 手机
  - 开发
  - UI
description: Cuto 1.0 开发时期探索的一个新 Android API
---

对于国内的一些 Android 用户而言，可能对快捷方式的认识只是停留在让国产流氓应用偷偷添加推广链接，常常忽略方便好用的被动式快捷方式（通常在 Launcher 中添加小部件可以找到）。

到了 Android 7.1，Google 重新重视快捷方式这一项功能，专门添加了一个新的模式。在已适配过特性的 Launcher 上（如 Pixel Launcher、Google Now Launcher 和 Nova Launcher），用户长按桌面上的 App 图标即可显示出开发者准备好的快捷方式。

![截图展示](../assets/201611-android-n-shortcuts/p1.png)

对快捷方式的作用理解有很多，我们尽可能只把最需要或是最便捷的动作放上来，就如 [Google 官方文档](https://www.open-open.com/misc/goto?guid=4959723247417751040) 说的：

- 在地图应用中导航用户到一个特定的地点
- 在通讯应用中发送信息给一位朋友
- 在媒体应用中播放下一集电视节目
- 在游戏中读取上一个存档点

这些动作除了可以在资源文件中预先编写为静态的快捷方式，然后在运行时进行修改；还可以在运行时通过 ShortcutManager API 推送、编辑、删除动态的快捷方式。官方文档所述一个应用最多推送五个快捷方式（包括静态和动态的快捷方式），用户可以将快捷方式固定到桌面，但应用无法删除那些已固定的快捷方式，只能禁用它们。

## 静态快捷方式

静态快捷方式，即是在 AndroidManifest 和资源文件预先声明的一种快捷方式，除了受 Android 7.1 支持，还可以兼容低版本（当然了，都需要 Launcher 配合）。一般用作常用功能的固定入口（如新建信息、设置闹钟、显示用户一天的活动之类），也可以在后续代码中通过 ShortcutManager 修改。

添加方法：

1. 首先要定位到 AndroidManifest.xml 作为启动入口的 Activity 。（Intent Filters 添加了 `android.intent.action.MAIN` 动作和 `android.intent.category.LAUNCHER` 分类的 Activity）。

2. 参照以下的代码，在 `<meta-data>` 元素中加入快捷方式的定义：

   ```xml
   <manifest xmlns:android="http://schemas.android.com/apk/res/android"
             package="com.example.myapplication">
     <application ... >
       <activity android:name="Main">
         <intent-filter>
           <action android:name="android.intent.action.MAIN" />
           <category android:name="android.intent.category.LAUNCHER" />
         </intent-filter>
         <meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />
       </activity>
     </application>
   </manifest>
   ```

3. 在 /res/xml 创建一个新的资源文件 (例如 shortcuts.xml) 作为快捷方式的定义。

4. 在这个新的资源文件中以 `<shortcuts>` 作为根 element ，其中包含若干个 `<shortcut>` 元素，记录着各个快捷方式的图标、标签、长标题以及启动 Intents:

   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
     <shortcut
       android:shortcutId="favorites"
       android:enabled="true"
       android:icon="@drawable/ic_shortcut_favourite"
       android:shortcutShortLabel="@string/label_favourites_shortcut"
       android:shortcutLongLabel="@string/label_favourites_shortcut_long">
       <intent
         android:action="android.intent.action.VIEW"
         android:targetPackage="com.sspai.cuto.android"
         android:targetClass="com.sspai.cuto.android.ui.FavouritesActivity" />
       <categories android:name="android.shortcut.conversation" />
     </shortcut>
     <!-- 这里可以定义更多的快捷方式 -->
   </shortcuts>
   ```

5. 到这里就完成了静态快捷方式的定义了，效果如图（此处用了第三方的 Launcher 显示，会额外显示一个 Icon options ，暂且不管）：

![Cuto 演示](../assets/201611-android-n-shortcuts/p2.png)

## 动态快捷方式

动态快捷方式，即是应用在运行时通过 ShortcutManager 进行动态添加的快捷方式，和以前所认识的“快捷方式”不同，它并不会直接丢到桌面而是像静态快捷方式一样显示在一个菜单中，一般只用于上下文相关的特定操作（比如常用联系人、订阅的节目之类会在应用使用过程中不断变化的数据）。这种快捷方式依赖于 Android 7.1 的新 API ，无法在低版本使用，这点需要注意。（期待 Google 推出相应的兼容库）

ShortcutManager API 允许你进行下列操作：

- 推送：使用 `setDynamicShortcuts(List)` 来重新设置动态快捷方式的列表，或者使用 `addDynamicShortcuts(List)` 来添加到已存在的快捷方式列表。
- 更新：使用 `updateShortcuts(List)`
- 移除：使用 `removeDynamicShortcuts(List)` 来移除一些快捷方式，或者通过 `removeAllDynamicShortcuts()` 移除全部快捷方式。

下面的代码片段就是创建一个动态快捷方式并添加到你的应用中：

```java
ShortcutManager shortcutManager = getSystemService(ShortcutManager.class);

ShortcutInfo shortcut = new ShortcutInfo.Builder(this, "id1")
    .setShortLabel("Web site")
    .setLongLabel("Open the web site")
    .setIcon(Icon.createWithResource(context, R.drawable.icon_website))
    .setIntent(new Intent(Intent.ACTION_VIEW,
                   Uri.parse("https://www.mysite.example.com/")))
    .build();

shortcutManager.setDynamicShortcuts(Arrays.asList(shortcut));
```

## 快捷方式的图标设计

为了和 Android 系统、其他应用的风格一致，应当按照 Material Design Guideline 中的介绍设计，但我阅读过程没有找到相关的资料，可能是刚刚推出新特性尚未跟进设计文档。

参考 Google 全家桶的应用后，在此提供个人总结的一些观点：

圆形底板：我想这个不用多说吧。

无阴影：快捷方式菜单中图标应和文本处于同一层面，而固定到桌面的快捷方式图标会由 Launcher 自动添加上一层阴影。

色调一致：尽量统一使用产品的主色调（当图标 Symbol 使用主色调时，背景使用 Grey 100： `#F5F5F5` ）

在此我提供 Cuto 中的一个样例和 PSD 模版供大家参考：

![随机按钮](../assets/201611-android-n-shortcuts/p3.png)

PSD 和 PNG：<https://pan.baidu.com/s/1nuOlcpz>

## 快捷方式的最佳实践

- 只添加四个以内不同的快捷方式
  尽管接口允许添加五个静态或动态快捷方式，但还是应当只添加四个以内，这样看上去会更加的整洁。

- 限制快捷方式的描述文本长度
  快捷方式菜单的显示空间很有限，短的描述应该控制在 10 个半角字符，而长描述应该控制在 25 个半角字符内。

- 动态快捷方式不会随着手机数据备份还原
  它并不会在备份还原的过程中保留，因此建议你在每次运行应用的时候通过 `getDynamicShortcuts()` 来检查项目数量并在必要时重新添加快捷方式，例如以下代码片段：

```java
public class MainActivity extends Activity {
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ShortcutManager shortcutManager =
                getSystemService(ShortcutManager.class);

        if (shortcutManager.getDynamicShortcuts().size() == 0) {
            // Application restored. Need to re-publish dynamic shortcuts.
            if (shortcutManager.getPinnedShortcuts().size() > 0) {
                // Pinned shortcuts have been restored. Use
                // updateShortcuts(List) to make sure they
                // contain up-to-date information.
            }
        }
    }
    // ...
}
```
