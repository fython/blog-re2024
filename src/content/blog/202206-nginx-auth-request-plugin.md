---
title: NGINX 通过 auth_request 插件实现 proxy 层检查登录态并自动跳转登录
pubDatetime: 2022-06-28T10:00:00.000+08:00
tags:
  - NGINX
  - 鉴权
  - 运维
  - 网关
description: 简单体验一下 ngx_http_auth_request_module 模块的能力和基本开发流程
---

NGINX 在 1.5.4+ 版本中引入了 ngx_http_auth_request_module 模块，提供 auth_request 参数允许在发送请求到路由前发起前置请求，将请求参数（如 Cookies）带到另一个接口中验证当前请求是否可以继续，来实现登陆态检查。

## 准备工作

1. NGINX 1.5.4+ 源码
2. `configure` 配置构建参数带上 `--with-http_auth_request_module`

编译 NGINX 方法请参考官方文档和互联网资料，在此不详细阐述

## 实现思路

带 `auth_request` 的路由在发送请求到目的地前，会发起前置请求，将主请求的参数（Cookies）带到前置请求中，发给 `auth_request` 指定的 URL，指定 URL 来告诉 NGINX 这次请求是否合法。

然而 `auth_request` 只接受 2xx、401 和 403 的返回值，不支持 301/302 跳转，前置请求返回的 `Set-Cookie` 也不会对主请求生效，我们没法在这次前置请求中把登录成功后的登陆态带给用户，`auth_request` 就只作当前登陆态是否有效的检查，如果无效就返回 401 或者 403，然后通过 `error_page` 修改这一条路由规则的 401 或 403 结果为跳转登录页面，登录成功后再 302 跳转到原路由，原路由再次做 `auth_request` 检查，此时登录态有效，允许用户继续请求到真实页面。

晚些再做一个流程图，可以先看代码辅助理解。

## 代码参考

### NGINX 配置

```nginx
server {
    listen 80;

    location /ngx_auth_demo/auth {
        proxy_pass http://127.0.0.1:3000;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
    }
    location /ngx_auth_demo/login {
        proxy_pass http://127.0.0.1:3000;
    }
    location /ngx_auth_demo/index {
        auth_request /ngx_auth_demo/auth;
        error_page 403 = @needlogin;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://127.0.0.1:3000;
    }
    location @needlogin {
        add_header Set-Cookie "NSREDIRECT=$scheme://$http_host$request_uri;Path=/";
        return 302 http://$host/ngx_auth_demo/login;
    }
}
```

### ngx_auth_demo Node.js 服务端

样例仅依赖 `express` 和 `cookie-parser` 包，运行前需要使用 NPM 安装依赖

```javascript
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const port = 3000;

app.use(cookieParser());

app.get("/ngx_auth_demo/auth", (req, res) => {
  console.log("request /ngx_auth_demo/auth");
  if (req.cookies["new_session"]) {
    console.log("user has logged in");
    res.status(200).send("OK");
    return;
  }
  console.log("user has no session. response 403");
  res.status(403).send("Forbidden");
});

app.get("/ngx_auth_demo/login", (req, res) => {
  res.cookie("new_session", `${new Date().getTime()}`, {
    expires: new Date(Date.now() + 1000 * 30),
    httpOnly: true,
    path: "/",
  });
  const redirectTo = req.cookies["NSREDIRECT"];
  console.log("login and redirect to", redirectTo);
  res.clearCookie("NSREDIRECT");
  res.status(302).redirect(redirectTo);
});

app.get("/ngx_auth_demo/index", (req, res) => {
  console.log("index with session:", req.cookies["new_session"]);
  res.status(200).send("index ok");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
```

## 参考资料

- NGINX 官网 Module `ngx_http_auth_request_module` 介绍：<http://nginx.org/en/docs/http/ngx_http_auth_request_module.html>
