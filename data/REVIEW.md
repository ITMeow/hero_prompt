# Demo Data Export Report

Generated at: `2026-07-17T04:07:18.592Z`
R2 public domain: `<your-r2-public-domain>`
R2 bucket: `<your-r2-bucket>`

## Database

| Table | Rows | Treatment |
|---|---:|---|
| `account` | 0 | ⛔ skipped (sensitive) |
| `ai_task` | 56 | ✅ exported as-is |
| `apikey` | 0 | ⛔ skipped (sensitive) |
| `chat` | 0 | ✅ exported as-is |
| `chat_message` | 0 | ✅ exported as-is |
| `config` | 0 | ⛔ skipped (sensitive) |
| `credit` | 119 | ✅ exported (emails sanitized) |
| `landing_post` | 672 | ✅ exported as-is |
| `landing_post_duplicate_0122` | 527 | ✅ exported as-is |
| `landing_post_view` | 493 | ✅ exported as-is |
| `order` | 0 | ✅ exported as-is |
| `permission` | 29 | ✅ exported as-is |
| `post` | 1 | ✅ exported as-is |
| `prompt_variable_categories` | 66 | ✅ exported as-is |
| `prompt_variable_keywords` | 417 | ✅ exported as-is |
| `role` | 4 | ✅ exported as-is |
| `role_permission` | 34 | ✅ exported as-is |
| `session` | 0 | ⛔ skipped (sensitive) |
| `subscription` | 0 | ✅ exported as-is |
| `taxonomy` | 0 | ✅ exported as-is |
| `user` | 63 | ✅ exported (PII sanitized) |
| `user_role` | 1 | ✅ exported as-is |
| `verification` | 0 | ⛔ skipped (sensitive) |

## Object Storage (R2)

- Downloaded: **178** → `public/uploads/`
- Failed: **1**

Failed objects:
- `keymind/1766042127121_9r375p_G8XTcGNaAAAmLN5.jpg`: HTTP 404 Not Found
- URL rewrites applied in SQL: **507**
- External URLs preserved: **3889** (Twitter, CDNs, etc.)

## Safety Guarantees

- `config` table (containing R2/Stripe/OpenAI keys) is **never** exported.
- `user.email/name/image` are replaced with `user_N@example.com` / `User N` / `null`.
- `order/subscription/credit` email fields are hashed + suffixed with `@example.com`.
- `apikey`, `account`, `session`, `verification` tables are excluded entirely.
- No R2 API credentials are required or read by this script.

## How Clone Users See This Data

1. `pnpm install` and set `DATABASE_URL` in `.env`.
2. `pnpm db:push` to create schema.
3. `psql "$DATABASE_URL" < data/db-demo.sql` to load demo data.
4. Images already in `public/uploads/` and served as `/uploads/...` by Next.js.
