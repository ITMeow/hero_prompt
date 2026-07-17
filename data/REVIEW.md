# Demo Data Export Report

Generated at: `2026-07-17T02:30:46.128Z`

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

- Listed: **103** objects
- Downloaded: **102** → `public/uploads/`
- Failed: **1**

Failed objects:
- `heroprompt/`: EISDIR: illegal operation on a directory, open '/Users/mac/Desktop/sortes_ai_projects/hero_prompt/public/uploads'
- URL rewrites applied in SQL: **309**

## Safety Guarantees

- The `config` table (containing R2/Stripe/OpenAI/etc. keys) is **never** exported.
- All `user.email` and `user.name` are replaced with `user_N@example.com` / `User N`.
- `user.image` is cleared.
- `order/subscription/credit` email fields are hashed + suffixed with `@example.com`.
- `apikey`, `account`, `session`, `verification` tables are excluded entirely.

## How Clone Users See This Data

1. They run `pnpm install` and copy `.env.example` to `.env` (or set `DATABASE_URL`).
2. They run `pnpm db:push` to create the schema.
3. They run `psql "$DATABASE_URL" < data/db-demo.sql` to load demo data.
4. Images are already in `public/uploads/` and served as `/uploads/...` by Next.js.
