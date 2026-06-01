---
title: 在 VPS 用「声明式」快速搭建个人多服务平台
pubDatetime: 2026-06-02T00:00:00.000+08:00
description: 当我造了很多轮子发现需要一个轮子把他们管理起来时
---

> 主要技术栈：Traefik + Docker + 自建认证网关（Python3）

事情的起因是这样的：我有一台 VPS，上面跑着几个小工具、一个机器人 Webhook 接收器、还有几个写着写着就变成了 Web 应用的脚本。

那些小工具我打算小范围开放给我的朋友使用，但又不想裸奔在公网上，而 HTTP Basic Auth 太简陋，Cloudflare ZeroTrust 配置也太麻烦。

至于服务网关/反向代理，以往我是每个服务用 Nginx 反代一下就完事了，但随着服务越来越多，问题也跟着来了：
每个服务一套 Nginx 配置，改一个就要 reload 一下，证书到期了要手动续，新上线一个服务要改 Nginx + 申请证书 + 加 DNS 记录一套下来十来分钟。

Nginx 虽然可靠稳定，我也是比较熟练配置，但总想追求更符合自己实际使用诉求的解决方案。

于是我决定参照 Traefik 自动发现 Docker 按 labels 配置路由/中间件的技术方案，让 AI 帮我做一个门户顺便最小化地实现一个认证系统，直接利用 Google OAuth 登录背书。

折腾完之后的效果是：**新增一个服务只需要写 15 行 YAML，30 秒上线，自带 HTTPS 和登录认证。** 下面聊聊具体怎么做的。

## 整体思路

核心就三样东西：

- **Traefik**：反向代理 + 自动 HTTPS 证书（类似 Nginx，但更适合 Docker 环境）
- **Docker Labels**：服务通过 compose 文件里的 labels 自己告诉 Traefik「我在这」
- **ForwardAuth**：所有请求先过一遍认证网关，通过了才放行

架构大概长这样：

```
         Internet
            │
            ▼
     ┌──────────────┐
     │   Traefik    │  自动 HTTP→HTTPS，自动申请证书
     └──────┬───────┘
            │
   ┌────────┼────────┐
   │  traefik-net    │  共享 Docker 网络
   │                 │
   │  认证网关        │  Google OAuth + ACL
   │  tsummt (量化)   │
   │  gex (GEX)      │  每个服务只多几行 labels
   │  hello (测试)    │
   │  ...            │
   └─────────────────┘
```

## DNS 通配符：一个容易被忽略的省心操作

在搞网关之前，我先在 Cloudflare 上做了一件事：给 `*.kazusa.feng.moe` 加了一条通配符 A 记录，指向 VPS 的 IP。

```
类型    名称                    内容              代理状态
A       kazusa.feng.moe        203.0.113.10      DNS only
A       *.kazusa.feng.moe      203.0.113.10      DNS only
```

> 选 DNS only 而不是 Proxied，是因为 Let's Encrypt 的 HTTP-01 验证需要直接访问 VPS 的 80 端口。如果你开了 Cloudflare 代理，就得改用 DNS-01 Challenge，需要配 Cloudflare API Token，稍微麻烦一点。

做了这件事之后，以后不管起什么新服务，域名直接解析过来，不用再去 Cloudflare 控制台重复操作。

## Traefik 配置

Traefik 的配置分两部分：静态配置（启动时加载一次）和动态配置（运行时热更新）。

静态配置放在 `traefik.yml` 里：

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https          # 所有 HTTP 请求自动跳转 HTTPS
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /certs/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false      # 这个很关键！
    network: traefik_traefik-net
```

重点说一下 `exposedByDefault: false` 这个配置。它的意思是：**只有容器显式打了 `traefik.enable=true` label 的，Traefik 才会去路由它**。这就解决了刚才通配符 DNS 的安全问题——就算有人访问 `random.kazusa.feng.moe`，Traefik 找不到对应的容器，直接返回 404。

Docker Compose 文件也很简单：

```yaml
services:
  traefik:
    image: traefik:v3.7.1
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro  # 只读挂载
      - traefik-certs:/certs
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
    networks:
      - traefik-net

networks:
  traefik-net:
    driver: bridge
```

## 新服务接入：真的只要几行 labels

这才是这套架构最爽的地方。比如我要上线一个叫 `tsummt` 的量化看板服务，它的 `docker-compose.yml` 长这样：

```yaml
services:
  tsummt:
    build: .
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tsummt.rule=Host(`tsummt.kazusa.feng.moe`)"
      - "traefik.http.routers.tsummt.entrypoints=websecure"
      - "traefik.http.routers.tsummt.tls.certresolver=letsencrypt"
      - "traefik.http.services.tsummt.loadbalancer.server.port=8000"
      - "traefik.http.routers.tsummt.middlewares=kazusa-auth@docker"
    networks:
      - traefik-net

networks:
  traefik-net:
    external: true
    name: traefik_traefik-net
```

就这么多。Traefik 会自动发现这个容器，自动配置路由，自动申请 HTTPS 证书。`kazusa-auth@docker` 这一行是认证中间件，后面会讲。

## 认证网关：kazusa-home-portal

这是我自己写的一个服务（[源码在 GitHub](https://github.com/GwoFinTech/kazusa-home-portal)），干了三件事：

1. **Google OAuth 登录**：不用自己管密码，用 Google 账号登录就行
2. **ACL 授权**：可以按域名 + 邮箱的通配符来控制谁能访问哪个服务
3. **服务仪表盘**：自动从 Docker labels 里读取服务列表，生成一个门户页面

认证的核心机制是 Traefik 的 **ForwardAuth**。简单说就是：每次有请求进来，Traefik 会先问一下认证网关「这个人能访问吗」，网关检查一下 Session 和 ACL，说 OK 才放行。

```
浏览器 → Traefik → 认证网关（检查登录 + 权限）→ 后端服务
                      ↓
                   没登录？→ 401，跳转 Google 登录
                   没权限？→ 403，显示无权限页面
```

认证中间件的声明也很简洁，在认证网关的 compose 文件里写一次：

```yaml
labels:
  - "traefik.http.middlewares.kazusa-auth.forwardauth.address=http://kazusa-home-portal:8000/auth/verify"
  - "traefik.http.middlewares.kazusa-auth.forwardauth.authResponseHeaders=X-User-Id,X-User-Email,X-User-Name,X-User-Role"
```

然后所有其他服务只需要引用 `kazusa-auth@docker` 就行，不用每个服务都配一遍认证逻辑。

Session 用的是 HMAC-SHA256 签名的 Token，存在 Cookie 里，24 小时过期。不依赖 Redis 之类的外部存储，服务端只需要一个密钥就能签发和验证。ACL 规则存在 PostgreSQL 里，支持 fnmatch 通配符，比如 `*.kazusa.feng.moe` 配 `*@gmail.com` 就是允许所有 Gmail 用户访问所有服务。

## 仪表盘自注册

每个服务还可以加几行 `homepage.*` labels，认证网关会自动读取这些 labels 生成仪表盘：

```yaml
labels:
  - "homepage.enable=true"
  - "homepage.title=tsummt"
  - "homepage.description=tsummt 量化看板"
  - "homepage.icon=📊"
  - "homepage.category=quant"
```

仪表盘会根据用户的登录状态和权限显示服务卡片——有权限的能点进去，没权限的显示「联系管理员」，没登录的显示「需要登录」。挺方便的，不用手动维护服务列表。

## 其他方案对比

在搞这套之前我也研究过不少方案，简单对比：

| 维度 | Traefik + 自建认证 | Nginx Proxy Manager | Caddy | K8s + Ingress | Cloudflare Tunnel |
|------|-------------------|---------------------|-------|---------------|-------------------|
| **配置方式** | Docker Labels（声明式） | Web UI（手动） | Caddyfile（手动） | YAML（声明式） | 控制台 / CLI |
| **服务发现** | 自动（Labels） | 手动添加 | 手动配置 | 自动（Service） | 手动添加 |
| **认证** | OAuth + ACL（可编程） | HTTP Basic Auth | 插件 / 前置代理 | 需额外组件 | Cloudflare Access（企业版） |
| **自动 HTTPS** | ✅ Let's Encrypt | ✅ Let's Encrypt | ✅（最简单） | 需 cert-manager | ✅（Cloudflare 管理） |
| **学习曲线** | 中等 | 低 | 低 | 高 | 低 |
| **资源需求** | 单台 VPS | 单台 VPS | 单台 VPS | 至少 3 节点 | 不需要 VPS |
| **适用规模** | 个人 / 小团队 | 个人 / 简单场景 | 单服务 / 简单场景 | 企业级（50+ 服务） | 个人 / 小团队 |

**Nginx Proxy Manager**：有 Web UI，点点鼠标就能配置，适合不想写 YAML 的人。但它的认证只有 HTTP Basic Auth，而且每次加服务都要在 UI 里手动操作，没法自动化。

**Caddy**：配置语法比 Nginx 简洁很多，自动 HTTPS 也开箱即用。但它的 Docker 集成没有 Traefik 深，多服务管理也没有 Traefik 的 Labels 机制方便。单个服务的话 Caddy 其实挺好的。

**Kubernetes + Ingress**：如果你有 50 个以上服务或者需要多人协作，K8s 确实是更好的选择。但对于个人开发者来说，K8s 的学习成本和资源开销（至少 3 节点集群）完全没必要。一台 2C4G 的 VPS 用 Docker Compose 就够了。

**Cloudflare Tunnel**：不需要暴露 VPS 端口，DDoS 防护也有，但数据要经过 Cloudflare，而且免费版有限制。另外 Cloudflare Access 的高级认证功能需要企业版。

我个人选择 Traefik 的原因很简单：Docker Labels 这个机制太顺手了，配置即代码，Git 可追踪，新服务上线真的只要 30 秒。

## 安全性

安全这块我分了三层来看：

**网络层**：`exposedByDefault: false` 保证只有显式启用的容器才会被路由，Docker Socket 只读挂载防止容器篡改 Traefik 配置，内部服务不暴露端口到宿主机。

**传输层**：全局 HTTP → HTTPS 重定向，Let's Encrypt 自动证书，不需要手动管理证书文件。

**应用层**：Google OAuth 登录（不用存密码），HMAC-SHA256 签名 Session（防篡改），fnmatch ACL 细粒度授权，Cookie 设了 HttpOnly + Secure + SameSite=Lax。

已知的风险主要是 Docker Socket 的只读挂载——虽然是只读，但 Traefik 容器理论上还是能读到所有容器的信息。如果对此比较敏感，可以用 [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) 做一层代理，限制 Traefik 只能读取容器列表，不能做写操作。

## 运维体验

以前用 Nginx 的时候，上线一个新服务大概是这样的流程：写 Nginx 配置 → certbot 申请证书 → 改 DNS 记录 → nginx -t 检查 → systemctl reload，顺利的话十来分钟，不顺利的时候（证书申请失败、配置语法错误）能折腾半小时。

现在呢：写 docker-compose.yml（15 行 labels）→ docker compose up -d → 完事。DNS 通配符已经搞定了，证书 Traefik 自动申请，认证复用已有的中间件。2-3 分钟，其中大部分时间还是在想服务名叫什么。

日常运维也省心不少：证书续签是自动的，不用 crontab 里挂 certbot；临时下线一个服务 docker compose stop 就行，不影响其他服务；加个用户权限在 Admin 面板点几下就好。

## 从零搭建：完整流程

如果你想复刻这套架构，下面是完整的步骤。假设你有一台 Linux VPS（2C4G 就够），已经装好了 Docker 和 Docker Compose，域名托管在 Cloudflare 上。

### 第一步：Cloudflare 通配符 DNS

在 Cloudflare DNS 面板加两条 A 记录：

```
A    *.your-domain.com    你的VPS_IP    DNS only (灰色云)
A    your-domain.com      你的VPS_IP    DNS only (灰色云)
```

### 第二步：创建共享网络

```bash
docker network create traefik_traefik-net
```

### 第三步：启动 Traefik

```bash
mkdir -p /opt/traefik && cd /opt/traefik
```

创建 `traefik.yml`：

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /certs/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik_traefik-net
```

创建 `docker-compose.yml`：

```yaml
services:
  traefik:
    image: traefik:v3.7
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/certs
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
    networks:
      - traefik-net

networks:
  traefik-net:
    driver: bridge
```

启动：

```bash
docker compose up -d
```

### 第四步：启动认证网关

本文只介绍用我写的 [kazusa-home-portal](https://github.com/GwoFinTech/kazusa-home-portal) 作为认证网关

```bash
git clone https://github.com/GwoFinTech/kazusa-home-portal.git /opt/kazusa-home-portal
cd /opt/kazusa-home-portal
```

创建 `.env`（需要先去 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 创建 OAuth 凭据）：

```env
DOMAIN=home.your-domain.com
GOOGLE_CLIENT_ID=你的ClientID
GOOGLE_CLIENT_SECRET=你的ClientSecret
GOOGLE_REDIRECT_URI=https://home.your-domain.com/auth/callback
SESSION_SECRET=随便生成一个长随机字符串
COOKIE_DOMAIN=.your-domain.com
PORTAL_URL=https://home.your-domain.com
PORTAL_HOSTS=home.your-domain.com,your-domain.com
ADMIN_EMAIL=your-gmail@gmail.com
DB_HOST=host.docker.internal
DB_PORT=5432
DB_NAME=kazusa_home
DB_USER=postgres
```

确保宿主机的 PostgreSQL 已经创建了 `kazusa_home` 数据库，然后启动：

```bash
docker compose up -d
```

启动后访问 `https://home.your-domain.com`，用 Google 账号登录，首次登录的用户会自动成为管理员。

### 第五步：部署你的第一个服务

假设你有一个 FastAPI 应用，创建 `/opt/my-app/docker-compose.yml`：

```yaml
services:
  my-app:
    build: .
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-app.rule=Host(`my-app.your-domain.com`)"
      - "traefik.http.routers.my-app.entrypoints=websecure"
      - "traefik.http.routers.my-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.my-app.loadbalancer.server.port=8000"
      - "traefik.http.routers.my-app.middlewares=kazusa-auth@docker"
      - "homepage.enable=true"
      - "homepage.title=My App"
      - "homepage.description=我的应用"
      - "homepage.icon=🔧"
    networks:
      - traefik-net

networks:
  traefik-net:
    external: true
    name: traefik_traefik-net
```

启动：

```bash
cd /opt/my-app && docker compose up -d
```

访问 `https://my-app.your-domain.com`，应该会被跳转到 Google 登录，登录后就能正常访问了。整个过程不需要改 DNS、不需要申请证书、不需要配 Nginx。

### 常用运维命令

```bash
# 查看所有服务状态
docker ps --format "table {{.Names}}\t{{.Status}}"

# 查看 Traefik 路由日志（排查问题用）
docker logs traefik --tail 50

# 重启单个服务
cd /opt/my-app && docker compose restart

# 查看当前证书
docker exec traefik cat /certs/acme.json | python3 -m json.tool | grep -A2 '"main"'

# 强制重新申请证书（证书出问题时用）
docker volume rm traefik_traefik-certs && cd /opt/traefik && docker compose restart
```

## 继续改进

- **安全加固**：可以加 [CrowdSec](https://www.crowdsec.net/) 做入侵检测，自动封禁恶意 IP；Traefik 也内置了 rateLimit 中间件可以防暴力破解
- **可观测性**：Traefik 原生支持 Prometheus metrics，可以接 Grafana 做监控面板；或者用 [Uptime Kuma](https://github.com/louislam/uptime-kuma) 做简单的可用性监控
- **高可用**：目前是单点，如果 VPS 挂了就全挂了。可以通过 DNS 负载均衡搞多台 VPS，数据库做主从复制
- **Docker Socket Proxy**：前面提到的，用代理层限制 Traefik 对 Docker API 的访问范围

---

## 最后

总结一下，这套架构的核心就一句话：**声明式服务接入**。每个服务只需要在 compose 文件里声明自己要什么域名、什么认证，网关自动搞定剩下的事情。对于个人开发者或者小团队来说，在一台 VPS 上跑十几个服务完全不是问题。

相关项目（全部开源）：
- [Traefik](https://github.com/traefik/traefik) — 反向代理
- [kazusa-home-portal](https://github.com/GwoFinTech/kazusa-home-portal) — 我写的认证网关 + 仪表盘（Apache 2.0）
- [Docker Compose](https://github.com/docker/compose) — 容器编排
- [Let's Encrypt](https://letsencrypt.org/) — 免费 TLS 证书
