# xjDAO AI 部署说明

本文档说明 xjDAO AI 当前 MVP 的本地运行、Docker 运行和后续生产部署建议。

## 本地开发

```bash
npm install
npm run dev
```

开发环境会同时启动：

- Vite 前端：http://localhost:5173
- Express 后端：http://localhost:8787

前端开发服务器已通过 `vite.config.js` 将 `/api` 请求代理到后端。

## Docker 部署

### 1. 准备环境变量

```bash
cp .env.example .env
```

### 2. 构建并启动

```bash
docker compose up -d --build
```

启动后访问：

```txt
http://服务器IP:8787
```

## Replit 部署建议

在 Replit 中导入本仓库后，运行：

```bash
npm install
npm run dev
```

如果需要让 Replit 使用固定端口，可以在环境变量中设置：

```txt
PORT=8787
```

## 生产环境建议

当前版本是 MVP，不建议直接处理真实用户敏感数据。生产环境建议补充：

1. 用户注册登录
2. API Key 服务端加密保存
3. 数据库持久化聊天记录
4. 请求频率限制
5. Token 额度统计
6. 模型调用成本上限
7. 管理后台
8. HTTPS 和反向代理
9. 日志脱敏
10. 异常调用报警

## 推荐生产架构

```txt
用户浏览器
  ↓
Nginx / Cloudflare
  ↓
Node.js API Server
  ↓
PostgreSQL / Redis
  ↓
OpenAI / DeepSeek / Gemini / Grok / 硅基流动 / MiMo
```

## 后续 Docker 优化

后续可以加入：

- 多阶段构建缓存优化
- 健康检查
- Nginx 静态资源服务
- PM2 或 Node cluster
- 自动 HTTPS
- GitHub Actions 自动构建镜像
