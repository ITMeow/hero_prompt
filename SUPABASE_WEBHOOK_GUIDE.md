# Supabase 数据库 Webhook 按需重验证指南

为了在保持数据新鲜的同时实现**毫秒级**的页面加载速度，我们实施了**按需重新验证 (On-Demand Revalidation)** 方案。这意味着 Next.js 将无限期缓存你的页面（提供纯静态 HTML），只有当你明确通知它时才会更新。

我们使用 **Supabase Database Webhooks** 来监听数据库变化，并在帖子创建或更新时通知你的 Next.js 应用。

## 先决条件

1.  **部署上线**: 你的应用必须已经部署到公网（例如 Vercel），这样 Supabase 才能访问你的 API 接口。
2.  **设置密钥 (Secret Key)**: 生成一个强大的密钥字符串（例如一长串随机字符）。
    *   在 **Vercel 环境变量**中添加名为 `REVALIDATION_SECRET` 的变量，填入该值。
    *   在本地测试时，也将其添加到 `.env` 文件中。

## 第一步：配置 Supabase Webhook

1.  登录你的 **Supabase Dashboard (控制台)**。
2.  进入 **Database (数据库)** -> **Webhooks**。
3.  点击 **Create a new webhook (创建新 Webhook)**。

### Webhook 基础设置

*   **Name (名称)**: `revalidate-posts`
*   **Table (表)**: `landing_post` (如果询问 Schema，请选择 `public`)
*   **Events (触发事件)**: 勾选 `INSERT` (插入) 和 `UPDATE` (更新)。(如果你希望删除操作也能立即反映，也可以勾选 `DELETE`)。

### Webhook 配置详情

*   **Type (类型)**: `HTTP Request`
*   **Method (方法)**: `POST`
*   **URL**: `https://your-project-domain.com/api/revalidate`
    *   *请将 `your-project-domain.com` 替换为你实际的 Vercel 域名。*
*   **Headers (请求头)**:
    *   点击 "Add header" (添加请求头)。
    *   **Name**: `Content-Type` -> **Value**: `application/json`
    *   **Name**: `x-webhook-secret` -> **Value**: `[YOUR_REVALIDATION_SECRET]`
        *   *此处填入你在 Vercel 环境变量中设置的那个密钥。*

### 完成设置

1.  点击 **Confirm** 或 **Create Webhook** 保存。

## 第二步：测试

1.  打开你已经部署的网站，进入某个帖子的详情页。它应该加载得非常快。
2.  去 **Supabase Table Editor (表编辑器)** 修改该帖子的数据（例如：在 `landing_post` 表中修改它的 `title`）。
3.  回到网站，刷新该帖子的详情页。
    *   **结果**: 标题应该**立即**更新（受 Vercel 全球节点传播影响，最慢也就 1 秒左右）。

## 故障排除 (Troubleshooting)

*   **检查 Vercel 日志**: 在 Vercel 后台查看 Function Logs，寻找 `POST /api/revalidate` 的记录。
    *   成功: 会显示 `Revalidating post: ...`
    *   错误: `Invalid secret` (说明请求头里的密钥和环境变量不匹配)。
*   **检查 Supabase Webhook 日志**: 在 Supabase Webhook 界面，你可以看到历史发送记录。如果状态是 Failed (如 500 或 401)，点击可以查看具体的响应内容。

## 原理解析

1.  **静态缓存**: 我们更新了代码，使用 `unstable_cache` 并加上了标签 `['posts', 'post-[id]']`。这让数据库查询结果在服务器端被长久缓存。
2.  **SSG 预渲染**: `generateStaticParams` 在构建时就提前生成了最新的 50 篇帖子的 HTML。
3.  **瞬间清除**: 当 Supabase 触发 API 时，代码执行 `revalidateTag('posts')`，这会瞬间标记旧的缓存过期。下一次用户访问时，Vercel 会提供最新的版本。

---
**日期**: 2026-01-12
**项目**: Hero Prompt