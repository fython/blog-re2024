---
title: Android 7.0 Scoped Directory Access 实践
pubDatetime: 2017-05-16T12:00:00.000+08:00
tags:
  - Android
  - 手机
  - 开发
  - 隐私
description: 基于自己使用的体验和过程简述一下 Scoped Directory Access API 使用
---

Android 7.0 引进了许多新特性和 API，其中有一点被很多人都忽略了，或许是没有注意到，或许是感觉使用起来比较麻烦，在这里我就基于自己使用的体验和过程简述一下这个叫做 “作用域目录访问（Scoped Directory Access）” 的新 API。

![Cuto 1.0 实践](https://blogfiles.feng.moe/images/201705-android-n-scoped-directory/p1.png)

如图所示，作用域目录访问和 Android 6.0 访问内部储存空间一样，需要应用程序主动向用户请求读写权限。不同的是，作用域目录访问不再要求应用声明 `android.permission.WRITE_EXTERNAL_STORAGE` 权限，也限制了应用程序访问内部储存空间行为，只能在请求的作用域内进行读写操作（包括文件、子文件夹）。

这个 API 看似意义不大，你获得了访问内部储存空间权限也同样可以向那些特定访问域中写入文件，但对于用户来说，能更加放心地让应用程序使用他 / 她的手机内部储存；对开发者 / 厂商而言，也严格要求自己不要滥用权限，未来高版本 Android 对存储机制大改的时候也能很快地应对（甚至无需做出任何改动）。

废话不多说，下面是作用域目录访问特性的使用：

## 权限声明

权限？不需要声明吧…… 哦，还要考虑到对旧版本 Android 的兼容，还是需要在 AndroidManifest 中声明内部储存权限，同时传统的访问方式应当保留下来，对 `Build.VERSION.SDK_INT` 进行判断再采取不同的措施。

对于 Android 7.0，可以尝试更加激进的权限声明：

```xml
<!-- maxSdkVersion 指定这个权限只在哪个版本以下使用 -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="24"/>
```

如果你的应用程序最低 SDK 版本就是 25，可以不加上这一行声明。

## 申请权限

使用 `StorageManager` 类获取你要访问的卷的 `StorageVolume` 实例。
要获取所有可用卷的列表，包括可移动介质卷，请使用 `StorageManager.getStorageVolumes()` 。

一般，我们只使用内部储存空间，只需要 `StorageManager.getPrimaryStorageVolume()` 获得主要卷即可。

然后，通过调用该实例的 `StorageVolume.createAccessIntent()` 方法创建一个 intent，使用此 intent 访问外部存储目录。
`createAccessIntent()` 需要传入一个参数指定你想访问哪个作用域，只能从以下常量中选择：

- Environment.DIRECTORY_MUSIC
- Environment.DIRECTORY_PODCASTS
- Environment.DIRECTORY_RINGTONES
- Environment.DIRECTORY_ALARMS
- Environment.DIRECTORY_NOTIFICATIONS
- Environment.DIRECTORY_PICTURES
- Environment.DIRECTORY_MOVIES
- Environment.DIRECTORY_DOWNLOADS
- Environment.DIRECTORY_DCIM
- Environment.DIRECTORY_DOCUMENTS

各个常量指定的位置和作用这里就不一一解释了，都是 Android 在内部储存或者 SD 卡中默认生成的公用文件夹。

示例代码：

```java
StorageManager sm = (StorageManager) getSystemService(Context.STORAGE_SERVICE);
Intent intent = sm.getPrimaryStorageVolume().createAccessIntent(Environment.DIRECTORY_PICTURES);
startActivityForResult(intent, REQUEST_SCOPED_PERMISSION);
```

执行了 Intent 后应用程序就会弹出请求对话框，等待用户确认。

## 接收请求结果和目录 Uri

`startActivityForResult()` 后待用户确认后，应用程序当前的 Activity 就会接收到请求结果，Request code 由自己决定（如前面的 `REQUEST_SCOPED_PERMISSION`）。

如果用户同意了权限，Result code 为 `RESULT_OK` ，且返回的 Intent 通过 `getData()` 可以获得一个目录 Uri。

获得目录 Uri 后强烈建议马上调用：

```java
getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
```

系统将保留此 URI，后续的访问请求将返回 `RESULT_OK` ，且不会向用户显示确认对话框。

## 访问文件和文件夹

和传统的访问内部储存空间的方式不同，File 类不适用于作用域目录访问，也不能简单的拼接相对路径获得目标文件或子文件夹。

这时候需要 `android.support.v4.*` 包中的 DocumentFile 类，通过这段代码：

```java
DocumentFile.fromTreeUri(this, uri)
```

获得申请到的作用域目录 DocumentFile，使用方式和 File 对象相差不大。

但需要注意的是，要获取文件或文件夹（包括次级目录）时，应当使用 `DocumentFile.findFile()` 逐步获得目标 DocumentFile。若运行过程发现文件夹不存在，则需要用到 `DocumentFile.createDirectory()`（请不要当作 findDirectory 使用，它会创建全新的文件夹）。

## 读写文件

得到了目标文件 DocumentFile 后，`getUri()` 即可获得 Uri 对象。
然后通过 ContentResolver 打开 FileDescriptor，便可创建 FileInputStream 文件输入流或者 FileOutputStream 文件输出流，进行操作了。

```java
// 第二个参数为读写模式，"r" 为只读，"w" 为写入
ParcelFileDescriptor pfd = context.getContentResolver().openFileDescriptor(uri, "w");
FileOutputStream fileOutputStream = new FileOutputStream(pfd.getFileDescriptor());
```

## 总结

基本使用大概就这样了，如果有什么建议或者错误欢迎提出纠正~
