# ShipAny Template Two

## Preview1

[https://cf-two.shipany.site/](https://cf-two.shipany.site/) [如果官网预览看到的不是最新就访问下面我部署到Cloudflare的地址预览最新版，但是注意：登录等不可用，仅仅是部署成功网站（能看个大概）哈]

[https://shipany-two.16781678.xyz/](https://shipany-two.16781678.xyz/)


## 由于多次发生仓库被提交脏代码，给其他同学带来不便，现将仓库写权限关闭，仓库成员仅可读！

## Doc

[✨ShipanyTwo官方文档](https://www.shipany.ai/zh/docs)

[✨ShipanyTwo按照官方文档一步步走过程记录](https://github.com/boomer1678/shipany-template/issues/2)

[✨ShipanyTwo更新日志](https://github.com/boomer1678/shipany-template/issues/3)

[✨ShipAnyTwo常见问题](https://github.com/boomer1678/shipany-template/issues/7)

[✨ShipAnyTwo架构要点总结](https://github.com/boomer1678/shipany-template/issues/1)


## Video

[✨ShipanyTwo实战课程：AI壁纸生成器开发视频教学(2025-12-03)](https://github.com/boomer1678/shipany-template/issues/6)

[✨ShipanyTwo实战课程：从零搭建了一个一站式 AI 生成平台(2025-11-26)](https://github.com/boomer1678/shipany-template/issues/9)

## Branch

- `main`: two main branch
- `cloudfare`: two cloudfare branch
- `one/main`: one main branch (2025-08-06(v2.6.0))
- `one/cloudfare`: one cloudfare branch 

## ShipAny Template Nano Banana Pro 模板上新，可扫码购买

![](https://cdn.jsdelivr.net/gh/ai-boomer/PicCDN/2025-12-9/1765259421745-image.png)

## Getting Started

1. Clone code and install

```shell
git clone git@github.com:boomer1678/shipany-template.git -b dev my-shipany-project
cd my-shipany-project
pnpm install
```

2. Set local development env

create `.env` file under root dir

```shell
cp .env.example .env
```

update env with DATABASE_URL and AUTH_SECRET

`DATABASE_URL` may like:

```shell
postgresql://user:password@host:port/db
```

`AUTH_SECRET` can be generated:

- [Generate Auth Secret](https://www.better-auth.com/docs/installation)

3. Create database tables with orm migrate

```shell
pnpm db:generate
pnpm db:migrate
```

4. Start dev server

```shell
pnpm dev
```

5. Deploy to vercel

push code to github and deploy to Vercel.
