# 项目上下文：ShipAny Template Two

## 概述
**ShipAny Template Two** 是一个基于现代 Web 技术构建的综合性 AI SaaS 样板项目。它旨在作为 AI 驱动应用程序的起点，具有身份验证、支付、国际化和文档系统等功能。

## 技术栈
*   **框架:** Next.js 16 (App Router)
*   **语言:** TypeScript
*   **样式:** Tailwind CSS v4, Shadcn UI, Framer Motion
*   **数据库:** PostgreSQL (通过 `postgres` 驱动), Drizzle ORM
*   **身份验证:** Better Auth
*   **AI 集成:** Vercel AI SDK (`ai`), Google GenAI, Replicate, OpenRouter
*   **内容:** Fumadocs (基于 MDX 的文档和博客)
*   **国际化:** `next-intl`
*   **部署:** Vercel, Cloudflare (OpenNext)

## 项目结构

### 关键目录
*   `src/app`: Next.js App Router 页面和 API 路由。
    *   `[locale]`: 国际化路由。
    *   `(admin)`: 管理员仪表板路由。
    *   `(auth)`: 身份验证路由。
    *   `(landing)`: 公共着陆页路由。
    *   `api`: 后端 API 端点。
*   `src/core`: 核心基础设施逻辑。
    *   `auth`: 身份验证配置 (`better-auth`)。
    *   `db`: 数据库连接和配置。
    *   `i18n`: 国际化逻辑。
    *   `rbac`: 基于角色的访问控制 (RBAC)。
*   `src/config`: 全局应用配置。
    *   `db/schema.ts`: 数据库模式定义 (Drizzle)。
    *   `index.ts`: 全局环境变量加载和配置导出。
*   `src/extensions`: 可插拔的功能模块 (广告, 联盟, AI, 分析, 邮件, 支付)。
*   `src/shared`: 共享工具、Hooks、组件和类型。
*   `content`: 用于文档 (`docs`)、日志和博客文章 (`posts`) 的 MDX 内容。
*   `public`: 静态资源 (图片, 图标)。

## 关键文件
*   `package.json`: 项目依赖和脚本。
*   `next.config.mjs`: Next.js 配置。
*   `tsconfig.json`: TypeScript 配置。
*   `.env.example`: 环境变量模板。
*   `src/config/index.ts`: 中央配置加载器。

## 开发工作流

###先决条件
*   Node.js (推荐 v20+)
*   pnpm (包管理器)
*   PostgreSQL 数据库

### 设置说明
1.  **安装依赖:**
    ```bash
    pnpm install
    ```
2.  **环境设置:**
    *   复制 `.env.example` 到 `.env`。
    *   填写 `DATABASE_URL`, `AUTH_SECRET` 和其他必需的变量。
3.  **数据库设置:**
    ```bash
    pnpm db:generate  # 生成迁移
    pnpm db:migrate   # 应用迁移
    ```
4.  **角色分配 (可选):**
    ```bash
    pnpm rbac:init
    ```

### 常用命令
*   **启动开发服务器:**
    ```bash
    pnpm dev
    ```
*   **构建生产版本:**
    ```bash
    pnpm build
    ```
*   **代码 Lint 检查:**
    ```bash
    pnpm lint
    ```
*   **数据库 Studio (Drizzle):**
    ```bash
    pnpm db:studio
    ```

## 约定
*   **包管理器:** 严格使用 `pnpm`。
*   **样式:** 使用 Tailwind CSS 工具类。组件主要基于 Shadcn UI。
*   **导入:** 使用 `@/` 别名指向 `src/` 目录。
*   **Async/Await:** 在异步操作中优先使用，而不是回调或 Promise。
*   **国际化:** 所有面向用户的文本都应使用 `next-intl` 翻译 Hooks 进行包装。
*   **环境变量:** 不要直接修改 `.env` 文件。如果需要更改，请指示用户进行操作。