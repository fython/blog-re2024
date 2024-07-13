---
title: 解决 VSCode Remote SSH 远程连接 glibc 高版本依赖问题
pubDatetime: 2024-02-18T08:41:15.000+08:00
tags:
  - Linux
  - 后端
  - 开发
  - IDE
description: 偶然在网上看到很多吐槽新版本 VSCode 不能连到稍旧点的 Linux 发行版，到底是怎么回事呢
---

# 问题

在今年一月的 VSCode 1.86 版本发布中，他们更新了 Electron 版本到 27，与此同时 Chromium 和 Node.js 版本也被更新上去了。
因为常常接触用 Node.js 和 Golang 写的项目，相比之下 Node.js 对 glibc 运行版本要求是比较高的，果不其然这次 Node 升级导致使用
Remote SSH 远程开发的用户[哀嚎一片](https://github.com/microsoft/vscode/issues?q=glibc)：

![过滤后的 VSCode 项目 Issues 列表](../assets/202402-fix-vscode-ssh-on-my-server/vscode-glibc-issues.png)

其中跟帖比较多的一个 Issue（[microsoft/vscode#203967](https://github.com/microsoft/vscode/issues/203967)）提到报错信息：

> error This machine does not meet Visual Studio Code Server's prerequisites, expected either...:
>
> - find GLIBC >= v2.28.0 (but found v2.17.0 instead) for GNU environments

提示很明确地指出服务器 glibc 版本不满足最低要求，但在一个发行版本不变的情况下更新 glibc 会有一定风险，即使会直接用 VSCode
SSH 上去的大多不是生产环境，因此很多人都选择挂倒车挡回到上一个版本的 VSCode 继续安安静静地写代码。

# 解决

VSCode 团队明确不会再向后兼容旧版本的 glibc，也不应该头痛砍头永远留在 VSCode 旧版本。

解决方案有很多，我列举一些方案并做对比：

- 使用容器环境开发，并更新容器镜像所使用的发行版本
- 保持系统发行版本不变，单独升级 glibc
- 单独部署新版本的 glibc 动态库文件，并让 Remote Server 链接到新版本

## 方案对比

### 方案一：使用容器环境开发

通过维护好的初始化脚本或配置文件在开发环境集群的 Docker 或 K8S 上创建容器，并用于开发和调试。

- 优点：环境维护成本低，可复现性高，一次配置后可以快速在不同的环境中构建运行
- 缺点：若项目生产环境存在旧版本情况，在较新发行版本的开发容器中研发测试过程无法及时暴露问题；环境上产生的临时数据需要注意持久化问题

### 方案二：单独升级操作系统中的 glibc 共享库

自行编译 glibc 源码后替换掉系统发行版本镜像中自带的版本。生产环境非常不建议这么做，开发环境操作前也建议备份好数据，保留恢复环境手段。

- 优点：无需重新部署整体系统环境，且后续该环境下有其他高版本 glibc 需求也能一起解决
- 缺点：系统上各种基础程序、服务都会依赖 glibc，单独更新可能存在不兼容，导致整个环境异常

### 方案三：单独部署 glibc 动态库并让 Remote Server 链接

自行编译 glibc 或下载预编译包，解压部署在其他路径，不替换系统 `/lib` / `/lib64` 下的共享库，借助 `patchelf`
按需对特定程序/软件调整动态库路径。做法个人理解和 Nix 包管理比较相似，但我的使用经验几乎没有（

- 优点：不影响系统上其他程序、服务，同时无需重新部署整体系统环境
- 缺点：需要自行管理单独部署的动态库目录，并且在软件更新后需要重新操作一次

## 方案三的实践

因为之前在工作中曾经实际应用过，所以我就简单举例我自己的 case，下面提到的软件包镜像和版本都需要自行判断是否适用，进行相应的替换，并非「开箱即用」～

测试环境：

- 发行版本：CentOS 7
- 处理器架构：x86_64

### 下载新版本 glibc & libstdc++ RPM 包

在 [rpmfind.net](https://rpmfind.net/linux/rpm2html/search.php?query=glibc&submit=Search+...&system=centos&arch=x86_64)
中找到所需要的 glibc 2.28
地址：<https://rpmfind.net/linux/centos/8-stream/BaseOS/x86_64/os/Packages/glibc-2.28-251.el8.x86_64.rpm>

以及 libstdc++
高版本地址：<https://rpmfind.net/linux/centos/8-stream/BaseOS/x86_64/os/Packages/libstdc++-8.5.0-21.el8.x86_64.rpm>

我将它们都下载到了自己的目录中备用，后续也将 glibc/libstdc++ 新版本单独部署在该目录中使用：

```shell
mkdir -p /home/fython/lib/vscode_server_linux_root
mv glibc-2.28-251.el8.x86_64.rpm /home/fython/lib/vscode_server_linux_root/
mv libstdc++-8.5.0-21.el8.x86_64.rpm /home/fython/lib/vscode_server_linux_root/
cd /home/fython/lib/vscode_server_linux_root
```

下载下来后切记不要直接 rpm 安装！

### 解压 RPM 包

通过 `rpm2cpio` 和 `cpio` 工具将两个 rpm 包解压到当前目录：

```shell
rpm2cpio glibc-2.28-251.el8.x86_64.rpm | cpio -idmv
rpm2cpio libstdc++-8.5.0-21.el8.x86_64.rpm | cpio -idmv
```

解压后检查下 so 文件中的 ABI 兼容版本是否符合 VSCode 或者 Node.js 的要求：

```shell
strings ./lib64/libc.so.6 | grep GLIBC
strings ./usr/lib64/libstdc++.so.6 | grep GLIBCXX
```

### 修改 Node 程序动态库链接

由于 VSCode Remote Server 是基于 Node.js 开发的，实际上我们需要进行修改的是一个 node 程序，具体位置可以通过 VSCode Remote
SSH 链接时的日志捕捉到：

![VSCode Remote SSH 日志截图](../assets/202402-fix-vscode-ssh-on-my-server/vscode-ssh-server-log-0.png)

通常情况下，node 二进制都是从系统环境（LD_LIBRARY_PATH）去寻找加载 glibc so 库，但直接修改 LD_LIBRARY_PATH
可能会破坏其他程序的正常运行，我们只通过 patchelf 去修改 node 二进制。

运行以下命令，使用 patchelf 对 node 进行修改，第三行替换为你再第一步获取到的 node 路径：

```shell
patchelf --set-interpreter $HOME/vscode_server_linux_root/lib64/ld-linux-x86-64.so.2 \
  --set-rpath $HOME/vscode_server_linux_root/usr/lib64:$HOME/vscode_server_linux_root/lib64 \
  ~/.vscode-server/bin/xxxxxxxxx/node
```

替换后可以用 ldd 验证下 node 二进制内的动态链接是否正确地链接到你单独部署的路径，直接运行 node 看到正常跑起来的话，在
VSCode SSH 建立连接时应该也能正常使用了。
