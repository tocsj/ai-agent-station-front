# AI Agent Station Frontend

AI Agent Station 的前端项目，基于 React + TypeScript + Vite。

当前前端包含：

- 工作台大盘
- 简历评估 Agent
- 模拟面试 Agent
- 文档知识助手
- 内容自动化 Agent
- 审计监控中心

## 环境要求

建议使用：

- Node.js 22+
- npm 11+

本项目已提交 `package-lock.json`，推荐用 `npm ci` 安装依赖，保证团队环境一致。

## 本地启动

1. 安装依赖

```bash
npm ci
```

2. 启动前端开发服务

```bash
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

如需指定端口，例如 5174：

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

然后访问：

```text
http://127.0.0.1:5174
```

## 后端接口代理

开发环境下，Vite 会把 `/api` 请求代理到后端：

```text
http://localhost:8091
```

配置位置：

```text
vite.config.ts
```

因此本地完整联调前，需要先启动后端服务，并确认后端监听端口是 `8091`。

如果后端端口不同，请修改 `vite.config.ts` 中的代理目标：

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8091',
      changeOrigin: true,
    },
  },
}
```

## 常用脚本

类型检查 + 生产构建：

```bash
npm run build
```

代码检查：

```bash
npm run lint
```

本地预览生产构建产物：

```bash
npm run preview
```

## 路由说明

主要页面路由：

```text
/dashboard   工作台大盘
/resume      简历评估 Agent
/interview   模拟面试 Agent
/knowledge   文档知识助手
/content     内容自动化 Agent
/monitor     审计监控中心
```

## 页面恢复说明

前端页面切换或浏览器刷新后，会优先从后端恢复运行状态：

- 内容自动化：恢复 active task、steps、publish record
- 文档知识助手：恢复 active workspace 和最近文档任务
- 简历评估：恢复最近简历和 active evaluation
- 模拟面试：恢复 active interview session，并用详情轮询同步运行中状态
- 审计监控：恢复筛选项并重新查询 dashboard 数据

前端本地缓存只作为加速提示，后端接口返回仍是最终状态来源。

## 验证结果

当前仓库在本机验证结果：

```bash
npm ci
npm run build
npm run lint
```

结果：

- `npm ci` 通过
- `npm run build` 通过
- `npm run lint` 无 error，但仍有少量 React Hooks 依赖 warning

这些 warning 不会阻断启动和打包，但后续可以继续清理。

## 常见问题

### 页面可以打开，但接口报 502 或请求失败

通常是后端服务没有启动，或后端端口不是 `8091`。

请检查：

- 后端是否已启动
- `http://localhost:8091` 是否可访问
- `vite.config.ts` 的代理地址是否正确

### clone 后启动失败

建议按下面顺序排查：

```bash
node -v
npm -v
npm ci
npm run dev
```

如果依赖安装异常，先删除本地 `node_modules` 后重新执行：

```bash
npm ci
```

### 生产构建后如何预览

```bash
npm run build
npm run preview
```

然后根据控制台输出访问预览地址。
