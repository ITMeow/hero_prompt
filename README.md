# HeroPrompt

> AI SaaS 应用，**所有采集数据已内嵌**：clone 仓库 → 一行命令 → 看到完整 demo。

## 这是什么

HeroPrompt 基于 [ShipAny Template Two](https://www.shipany.ai/zh/docs) 的二次开发，专注于 **AI 提示词采集 + 图像生成**。本仓库特别针对"开源可复现"做了优化：

- ✅ **Supabase 数据库已脱敏 dump 到 `data/db-demo.sql`**（包含所有业务表：post、taxonomy、landing*post、social_post、prompt_variable*\* 等）
- ✅ **Cloudflare R2 图片已镜像到 `public/uploads/`**（约 31MB，可直接被 Next.js 当静态资源提供）
- ✅ **URL 已改写**：dump SQL 里的 R2 域名为 `/uploads/<key>`，外链（Twitter、CDN）保留原样
- ✅ **零配置启动**：clone 后只需本地一个 Postgres + `pnpm install && pnpm dev`

⚠️ **隐私保证**：`config`（密钥）、`apikey`、`account`、`session`、`verification` 表**不会**导出；`user` 表的 `email/name/image` 全部脱敏；订单/订阅/积分的邮箱字段哈希化。REVIEW.md 和 manifest 不含真实 R2 公开域名或 bucket 名。详见 [`data/REVIEW.md`](./data/REVIEW.md)。

---

## ⚡ 30 秒快速启动（Demo 模式）

> **前置条件**：Node 20+、pnpm 9+、PostgreSQL 14+（或 Docker）
>
> psql 客户端（`brew install postgresql@16` 或 `apt install postgresql-client`）

### 方式 A：本地 Postgres（macOS）

```bash
# 1. 启动本地 Postgres（任选其一）
brew services start postgresql@16          # Homebrew
# 或
docker run -d --name hero_prompt_pg \
  -p 5432:5432 -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hero_prompt postgres:16

# 2. 准备项目
git clone https://github.com/ITMeow/hero_prompt.git
cd hero_prompt
pnpm install
cp .env.example .env

# 3. 编辑 .env,只填一项 DATABASE_URL
#    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hero_prompt
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hero_prompt' > .env
echo 'AUTH_SECRET='"$(openssl rand -base64 32)" >> .env

# 4. 一行命令初始化数据
bash scripts/init-demo-data.sh

# 5. 启动
pnpm dev
# 打开 http://localhost:3000
```

### 方式 B：用脚本自动拉起 Docker Postgres

```bash
pnpm install
cp .env.example .env
node scripts/init-demo-data.mjs --docker
pnpm dev
```

### 方式 C：Windows / 不想用 psql

```bash
pnpm install
cp .env.example .env
# 设置 DATABASE_URL 指向你的 Postgres
node scripts/init-demo-data.mjs   # 脚本内部会提示输入
pnpm dev
```

---

## 🚀 完整部署模式（Supabase + Cloudflare R2 + AI 接入）

如果你想让用户**写入新数据、上传图片、调用 AI 生成**，需要把存储升级为真实云服务。

### 1. 部署 Supabase 数据库

**选项 A：用 Supabase Cloud（最快）**

1. 注册 [supabase.com](https://supabase.com) → New Project
2. Project Settings → Database → Connection string → **Transaction pooler** (端口 6543)
3. 复制到 `.env` 的 `DATABASE_URL`：
   ```
   DATABASE_URL=postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
4. 在 Supabase SQL Editor 跑 `pnpm db:push` 生成的 SQL（或项目里的 `src/config/db/migrations/*.sql`）
5. 初始化 demo 数据：
   ```bash
   # 从 Supabase Dashboard → Settings → API 拿连接串
   psql "$DATABASE_URL" -f data/db-demo.sql
   ```

**选项 B：自托管 Supabase（Docker）**

```bash
# 克隆 supabase/supabase 并启动
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker
cp .env.example .env   # 修改密码、JWT secret
docker compose up -d

# 你的 DATABASE_URL 形如：
# postgresql://postgres:your-super-secret-jwt-token@localhost:5432/postgres
```

📖 详细文档：[supabase.com/docs/guides/self-hosting](https://supabase.com/docs/guides/self-hosting)

### 2. 接入 Cloudflare R2 对象存储

1. Cloudflare Dashboard → **R2** → Create bucket（命名如 `your-bucket-name`，**不要使用生产环境的真实 bucket 名**）
2. R2 → **Manage R2 API Tokens** → Create API Token，权限：Object Read & Write
3. 在 `.env` 填入：

   ```env
   R2_ACCOUNT_ID="你的 account id"
   R2_ACCESS_KEY="token access key"
   R2_SECRET_KEY="token secret access key"
   R2_BUCKET_NAME="your-bucket-name"
   R2_UPLOAD_PATH="uploads"
   R2_DOMAIN="https://pub-xxxx.r2.dev"   # 或自定义 CDN 域名
   ```

4. （可选）创建 R2 → Public Bucket 或绑定自定义域
5. 在项目 `/admin/settings/storage` 页面也能修改这些配置（写入 `config` 表）

📖 详细文档：[developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/)

### 3. 接入 AI Provider

在 `.env` 填入至少一个：

```env
# 推荐：OpenRouter 统一网关（支持 GPT-4 / Claude / Gemini / 国产模型）
OPENROUTER_API_KEY="sk-or-xxx"

# 图像生成
REPLICATE_API_TOKEN="r8_xxx"
FAL_API_KEY="fal_xxx"
GEMINI_API_KEY="xxx"
KIE_API_KEY="xxx"
```

### 4. 接入支付（Stripe / PayPal / Creem）

```env
STRIPE_PUBLISHABLE_KEY="pk_xxx"
STRIPE_SECRET_KEY="sk_xxx"
STRIPE_SIGNING_SECRET="whsec_xxx"
```

WebHook URL: `https://your-domain.com/api/payment/stripe/webhook`

### 5. 部署到 Vercel / Cloudflare Pages

```bash
# Vercel
vercel --prod

# Cloudflare Pages + Workers
pnpm cf:deploy
```

记得在部署平台的环境变量里填上 `.env` 的所有非空字段。

---

## 📦 数据导出（开发期如何采集/同步数据）

如果你在做数据采集/爬虫/AI 任务，采集到 Supabase + R2 后需要再次同步到仓库，跑：

```bash
# 1. 临时把 .env.development 切回生产 Supabase 连接（或修改 DATABASE_URL）
# 2. 运行导出
pnpm tsx scripts/export-demo-data.ts

# 3. 检查导出报告
cat data/REVIEW.md
cat data/export-manifest.json

# 4. 提交
git add data/ public/uploads/
git commit -m "chore(demo): sync data snapshot $(date +%Y-%m-%d)"
git push
```

导出过程会：

1. 读 `.env.development` 里的 `DATABASE_URL` 连到 Supabase
2. 从 `config` 表读 R2 凭据（**凭据不会被 dump**）
3. 导出所有非敏感表为 `data/db-demo.sql`（user 表 PII 全部脱敏）
4. 列出并下载 R2 bucket 所有对象到 `public/uploads/`
5. 把 SQL 里指向 R2 公开域名的 URL 改写为 `/uploads/<key>`
6. 生成 `data/REVIEW.md`（每张表的行数 + 脱敏情况 + 失败对象）

---

## 🗂 项目结构

```
.
├── data/
│   ├── db-demo.sql             # 脱敏后的 SQL dump（git 入库）
│   ├── export-manifest.json    # 导出元数据（git 入库）
│   └── REVIEW.md               # 导出报告（git 入库）
├── public/
│   └── uploads/                # R2 镜像（git 入库，约 130MB）
├── scripts/
│   ├── export-demo-data.ts     # Supabase + R2 → 仓库  导出脚本
│   ├── init-demo-data.sh       # 仓库 → 本地 Postgres  初始化
│   ├── init-demo-data.mjs      # 跨平台初始化（带 --docker 选项）
│   ├── grant-credits.ts        # 给指定用户加积分
│   └── init-rbac.ts            # 初始化角色权限
└── src/
    ├── app/                    # Next.js 页面
    ├── config/db/schema.ts     # Drizzle 表定义
    ├── core/db/                # DB 连接
    └── extensions/storage/     # R2 / S3 provider
```

---

## 🧰 开发命令

```bash
pnpm dev               # 启动 dev server (http://localhost:3000)
pnpm build             # 生产构建
pnpm lint              # ESLint
pnpm tsc --noEmit      # 类型检查
pnpm db:push           # 直接推送 schema 到 DB（开发用）
pnpm db:generate       # 生成 migration 文件
pnpm db:migrate        # 执行 migration
pnpm db:studio         # 打开 Drizzle Studio

# 数据相关
pnpm tsx scripts/export-demo-data.ts   # 导出 demo 数据 + R2
bash scripts/init-demo-data.sh         # 导入 demo 数据
node scripts/init-demo-data.mjs --docker  # 同上 + 自动起 docker pg
```

---

## 🔌 后台管理

启动后访问：

| 路径                      | 说明                          |
| ------------------------- | ----------------------------- |
| `/`                       | 落地页（采集的 prompts 展示） |
| `/admin`                  | 后台首页（需 admin 角色）     |
| `/admin/posts`            | 文章管理                      |
| `/admin/users`            | 用户管理                      |
| `/admin/settings/storage` | 改 R2 凭据                    |
| `/admin/settings/ai`      | 改 AI Provider 凭据           |
| `/admin/settings/payment` | 改支付凭据                    |

默认管理员账号在 dump 中未创建（出于安全），首次启动后请手动到 `/admin` 注册一个账号并执行：

```bash
pnpm tsx scripts/init-rbac.ts --admin-email=your@email.com
```

---

## 🛡 安全清单

发布到公开 GitHub 前请确认：

- [x] `config` / `apikey` / `account` / `session` / `verification` 表**不会**导出
- [x] `user.email/name/image` 脱敏（`user_N@example.com` / `User N` / `null`）
- [x] 订单/订阅/积分的邮箱字段哈希化
- [x] `.env` 已在 `.gitignore` 中，不会被提交
- [x] R2 凭据只存于 Supabase `config` 表，**不会**出现在 dump 中
- [x] 外部图片链接（Twitter 等）保留原样，不下载

### 🛡 导出脚本里也做了脱敏

[scripts/export-demo-data.ts](file:///Users/mac/Desktop/sortes_ai_projects/hero_prompt/scripts/export-demo-data.ts) 写入 `data/REVIEW.md` 和 `data/export-manifest.json` 时，**真实 R2 公开域名**和 **真实 bucket 名**会被替换为 `<your-r2-public-domain>` / `<your-r2-bucket>` 占位符；下载失败记录中**不会**输出含域名的 `url` 字段。控制台日志中仍会显示真实值，便于本地运维核对。

---

## 🙏 致谢

本项目基于 [ShipAny Template Two](https://github.com/shipanyai/shipany-template-two) 二次开发，AI SaaS 模板首选。

### ShipAny 文档

- [✨ ShipAnyTwo 官方文档](https://www.shipany.ai/zh/docs)
- [✨ ShipAnyTwo 逐步过程记录](https://github.com/boomer1678/shipany-template/issues/2)
- [✨ ShipAnyTwo 更新日志](https://github.com/boomer1678/shipany-template/issues/3)
- [✨ ShipAnyTwo 常见问题](https://github.com/boomer1678/shipany-template/issues/7)
- [✨ ShipAnyTwo 架构要点总结](https://github.com/boomer1678/shipany-template/issues/1)

### ShipAny 视频教程

- [✨ ShipanyTwo 实战课程：AI 壁纸生成器开发](https://github.com/boomer1678/shipany-template/issues/6)
- [✨ ShipanyTwo 实战课程：从零搭建一站式 AI 生成平台](https://github.com/boomer1678/shipany-template/issues/9)

### 预览

- [ShipAnyTwo 官方预览](https://cf-two.shipany.site/)
- [Cloudflare 部署预览](https://shipany-two.16781678.xyz/)

### 分支

- `main`: 主分支（本仓库当前所在）
- `cloudfare`: Cloudflare 部署分支
- `one/main`: One 模板 v2.6.0+

---

## 📄 License

Based on ShipAny Template Two (MIT). See [LICENSE](./LICENSE).
