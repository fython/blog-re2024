---
title: 写 Golang 的第三年
pubDatetime: 2023-06-26 01:10:01
tags:
  - Golang
  - 后端
  - 开发
description: 简单讲讲为什么我转向了 Golang 后端，以及路上踩过的一些坑
---

# 为什么我会开始写 Golang

毕业找工作时从 Android 业余开发转去做后台运维、运营系统开发后，接触了 Golang 和 Vue.js，开始在鹅厂全干的社畜旅程，至今也已经第三年了，在那之前从来没有接触过
Golang，后端也只是写了一些 Java 和 Python，区别还是挺大的，但是上手却非常快，闲来谈谈我这三年的学习和感触。

假设我在一个全新的团队里做新的后端服务项目，需要考虑的事情有很多，其中选择语言需要考虑的一些基本点：

- 开发工具、社区生态是否成熟，项目涉及技术栈有无成熟的框架库
- 性能和扩展性能否满足项目的当下需求以及未来发展
- 学习成本如何，有多少人熟悉这门语言或有丰富的项目经验
- 平台可移植性，在不同架构、操作系统下兼容需要付出多少成本
- 安全性和稳定性，运行时或语法有没有现代特性帮助研发人员降低风险

当然，你可能还要考虑是否适合当下流行的云原生，我理解是要看是否适合开发易于弹性扩展的微服务架构，运行时需要体积足够轻便、启动开销小，在我过去所使用的
Java 语言开发后端就恰恰相反，它更适合开发单体服务架构。至于单体服务好还是微服务好，这篇文章先不作评论，有机会再谈谈我的理解。

在鹅厂开始写 Golang，实际上并不是我个人的决定（I'm new graduate here），只是我实习所在的组刚好开始尝试从 Python 转向 Golang
开发 Web 系统，我作为新人成为了第二个吃螃蟹的成员，组里一些同事本身也不是开发，有运维也有 SRE，我需要开发的需求也十分简单，因此整个上手过程也是十分顺畅。

# 第一年的从零开始

第一次打开 [golang.org](golang.org) 下载并安装 Go 开发 CLI 到机器的同时，在浏览器 Playground 运行了第一个 Hello
World，过了遍官方[入门教程](https://go.dev/tour/)，从开发工具到语法特性都给人感觉很小清新（x

有几点对我个人来说特别关注的：

- 没有泛型（2020 年入职最高版本还是 1.14，Go 团队起初计划在 1.16 加，一直咕咕到 22 年推出的 1.18 版本）
- public/private 修饰通过变量、函数名的首字母大小写进行定义
- 没有 try-catch 语法，而业务逻辑的错误也不会使用 panic-recover 去处理，类似 C/C++ 的 return code 风格
- 没有线程只有协程，并且 API 非常简洁，你甚至无法获取协程 ID 和使用协程变量（除非用黑魔法获取）

大体上主要是习惯上会有很大的差异，但对我来说最不习惯的是没有泛型和错误处理方式，前者让在 Java/Python 只需要使用 filter/map
函数能解决的简单数据处理，在 Golang 上需要写一个 for-range 循环（一旦数据有连续的串行处理行数就爆炸）；后者写一个业务逻辑函数轻轻松松就写出一堆
`if err != nil {}` 判断分支，据说 Go 2 会改，但还远着。

其余的语法部分感受和我在网上看到的评价基本一致，都是降低心智负担的设计，同时自带 `gofmt`
从官方的立场上统一了代码风格规范，不必再纠结符号什么时候该换行、该加空格，对比起 C++
这种历史包袱比较重的编程语言来说，对于团队协作和人才培养是要简单不少的，这几年也确实看到业界很多业务都转向使用
Golang，岗位也逐渐增多。

# 第二年来的心路历程

在头一年中，我靠着 Go 迅速地重构了一些内部运营研发过程中比较核心的业务（当然前端也是需要我去做的），从独立开发每天抠 UI 变成了
“CRUD boy”。作为一个老 INFP，只是每天做重复的工作自然我是不会满意的，因为团队写 Go 的人不多，基础建设都还在 Python/C++
上搬运过来，在补齐业务公共库的同时开始研究效率问题，避免每天加班做过多的无用功。

## 尝试使用函数式编程解决问题

撸的业务大多就是简单的增删查改，偶尔有些定时任务要去做写数据查询、聚合，换作 Java 或者 Python 我可能很快就用 Stream API
或者其他框架搞定了，但是 Golang 没有泛型也不欢迎链式调用，for-range 虽然能按朴素写法保证大家都能看懂且兼顾性能，但阅读起来仍不够直观也不够
effective。起初我是针对一些原生类型（如 int、string）的数组或 map 写了一些公共方法去做一些查询、变换，但大多数情况我需要串行处理的都是一些
struct 结构，按 Java 的写法就是：

```java
List<Fruit> fruits = List.of(...);

List<Apple> apples = Stream.of(fruits)
  .filter(f -> f.getName() == "Apple" && f.getWeight() > 10)
  .map(f -> {
    f.setSomething("yummy");
    return Apple.from(f);
  })
  .collect(Collectors.toList());
```

而 Go 原生写法需要写成：

```go
fruits := []Fruit{...}

var apples []Apple
for _, f := range fruits {
    if f.Name == "Apple" && f.Weight > 10 {
        f.SetSomething("yummy")
        apples = append(apples, NewAppleFromFruit(f))
    }
}
```

在这个 case 中，Go 和 Java 的行数一样，而 Go 就是朴素的 for/if 语法，但如果逻辑变复杂、重复的段落更多，你可能需要嵌套多个
for/if 语句块才能解决问题，从阅读效率和减少出错的角度来看，链式调用的查询实现能帮助我们更容易实现鲁棒性高的业务代码，因为不同的流程需求都通过相同的
API 标准化了相当大的部分， Code Review 也更加简单。而计算性能的差距可能只是整个逻辑执行中的冰山一角，网络、I/O
耗时都需要考虑进来，避免舍大取小。

在实践过程中，我用过 [go-linq](https://github.com/ahmetb/go-linq) 库来实现链式调用查询逻辑，尽管它不是类型安全的，你可能在运行时做类型推断有误引发
panic，无法在编译期及时发现，但本身也需要通过充分的测试用例来验证其他部分的正确性，通过它我把上述原生写法改成了：

```go
fruits := []Fruit{...}
var apples []Apple

linq.From(fruits).WhereT(func (f Fruit) bool {
    return f.Name == "Apple" && f.Weight > 10
}).SelectT(func (f Fruit) Apple {
    f.SetSomething("yummy")
    return NewAppleFromFruit(f)
}).ToSlice(&apples)
```

在 Go 1.17 RC 版本出来后，我了解到泛型已经作为实验性功能被引入后，第一时间去尝试实现一直期望类似 Python 的 filter/map
函数，尽管没有 Stream API 链式调用那么整洁，但也是提高了效率和可读性，因为 IDE 和生态配套不完善，而实验性功能也不适合用于生产中，就仅仅只是试验：

```go
func filter[E any, S ~E](src S, fn func(E) bool) (dst S) {
    for _, e := range src {
        if fn(e) {
            dst = append(dst, e)
        }
    }
    return
}

even := filter([]int{1, 2, 4, 6, 8}, func (e int) bool {
    return e % 2 == 0
})
// even: {2, 4, 6, 8}
```

## 用好层层透传的 Context

刚开始上手 Golang 可能很多新人都没有关注到这个 Context 究竟是做什么的，毕竟很多语言都没有这种显式的上下文参数在不同函数间传来传去，在实现业务时很可能就忽略了
Context 可以帮我承载一些上文的环境值，以及业务需要正确处理的异常、超时场景。

初学看了一些中文介绍，它们的描述是“在不同的 Goroutine
中传递上下文值、取消信号、超时信号等”，我认为是不够准确的，因为即使我实现了一个简单的单并发程序，我在主协程上控制程序最多执行的时间也需要通过
Context 去实现，我会在 `main()` 函数创建一个 Timeout 为 10s 的 Context，让它在发起一个耗时的网络访问时最多等待 10 秒：

```go
package main

import (
    "context"
    "time"
    "net/http"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://google.com", nil)
    if err != nil {
        panic(err)
    }
    rsp, err := http.DefaultClient.Do(req)
    if err != nil {
        // 如果前面的逻辑到网络请求结束前的时间超过了 10s，Do 函数就会返回一个 DeadlineExceeded error
        panic(err)
    }
    // ... print response or do some stuff
}
```

通过阅读官方英文文档，Context 的定义是

> Package context defines the Context type, which carries deadlines, cancellation signals, and other request-scoped
> values across API boundaries and between processes.

翻译过来就是 Context 类型在 API 边界和流程间传递超时/取消信号和其他当前请求相关值。按我的理解，它也负责同一个 Goroutine
中函数调用链上信号和上下文值层层传递。

在上述例子中，`http.DefaultClient` 没有默认超时时间，如果没有使用带超时的 Context
来控制请求，那么有可能程序永远就挂在这里了，若是高并发服务上就可能会有一个协程阻塞住，当被阻塞住的协程越积越多，就有可能引发服务崩溃。除此以外，微服务经常迭代升级的过程中会遇到需要重启服务的情况，当外界程序要求你退出时，你可能需要通过一个统一的通道去告知所有正在执行的请求要优雅地结束（尤其是分布式事务），Context
也会是一个有力的伙伴。

Golang 协程没有直接退出的函数支持，大概也是因为有 Context 的设计，要求开发者自己正确处理协程退出，而不是粗暴地结束不知道运行到什么状态的线程，因此大家常常在存在
I/O 操作或其他慢调用的函数第一个入参要求传入 Context，就像 `if err != nil {}` 一样遍地开花（

## 依赖管理

起初写 Go 的时候，依赖管理还用着最原始的 GOPATH 模式，这个模式有点像在一个大而全的 monorepo
下开发工作，就意味着不同项目/子目录下的代码都会指向同一个版本的依赖，现实就是我们业务并不是 monorepo
模式，不同的业务仓库可能依赖的版本不同就会存在问题，往往解决都是让使用旧版本依赖且不兼容的业务仓库及时对齐到当前使用的新版本，我认为这并不是很好的变更行为，有可能代码只工作在旧版本下，而突发的依赖冲突可能导致人为缺少充分测试就上线了，业务仓库代码
commit 记录并不能观察到这个变更。

于是 Go 1.5 引入了 vendor 模式，这一点很像 Node.js 的包管理方式，通过项目下声明的依赖版本，在编译构建前下载好依赖保存在当前项目文件夹中（版本控制只提交声明版本的
JSON 配置，不提交依赖代码），当然坏处很显然所有项目都要完整地把所有依赖下载一遍，对硬盘和网络资源紧张的环境很不友好，产生大量重复冗余的文件。

后来 Go 1.11 引入 module 模式，同样是项目下编写文件声明依赖版本（go.mod），但同一个版本的依赖只会在当前开发环境的 GOPATH
目录下保存一份，并且经过 go sumdb 记录跟踪依赖模块的哈希值，保证项目构建的可复现性，相对于 vendor 模式更加完善，成为当下的主流依赖管理方式。

# 三年后

如今 Go 1.18 已经把泛型带到正式语法中，`golang.org/x/exp` 中 slices/maps 包基于泛型的扩展函数也在 Go 1.21 中正式登场，我也不必再用那么
oldschool 的写法去实现没有性能要求的简单业务逻辑，同时也可以自行实现一些特殊需求（如线程安全）的数组、字典容器去代替原生类型。

公司和业界都有持续萌发出更多成熟的 Golang 框架/库，在云原生时代潮流下 Golang 也愈加流行，很多人也开始尝试在移动端、浏览器
WebAssembly 甚至嵌入式设备中编写 Golang 项目。

但语言终究只是一个工具，不同的业务需求可能依赖着不同的社区生态去支撑，像大数据领域一直都是 Java 的强项，不时就会有人讨论能否使用
Golang 或者 Rust 去重写那些框架，大多只是以个人喜好的角度去考量，忽略了成本和收益，选择一把好刀又好又快解决问题才是关键。

今后还有机会接触不同的语言、框架，也许会去尝试下“网红”语言 Rust，又或者会回到前端写写 Flutter 在用的 Dart。
