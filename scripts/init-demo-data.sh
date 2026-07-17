#!/usr/bin/env bash
# [INPUT] .env 中的 DATABASE_URL；data/db-demo.sql 与 public/uploads/ 必须已存在（git 仓库自带）。
# [OUTPUT] 在目标 Postgres 中创建 schema 并导入 demo 数据；不修改 .env 本身。
# [POS] 项目根目录 scripts/init-demo-data.sh，clone 项目的用户运行 `bash scripts/init-demo-data.sh` 即可看到完整 demo。
#
# [PROTOCOL]:
#   1. 必须先存在 DATABASE_URL（脚本会检查，不存在则退出并提示）。
#   2. 使用 pnpm db:push 创建表结构（与 dump.sql 列定义一致）。
#   3. 用 psql 导入 data/db-demo.sql；找不到 psql 时给出明确错误。
#   4. 不删除任何用户数据；导入前 TRUNCATE 已经写在 dump 头部。
#   5. 必须幂等：再次执行不会破坏数据（dump 内部 TRUNCATE 一次后 INSERT）。

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "▶ hero_prompt demo data initializer"
echo "====================================="

# 1. 检查 env
if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
elif [[ -f ".env.development" ]]; then
  echo "ℹ️  .env not found, falling back to .env.development"
  # shellcheck disable=SC1091
  set -a; source .env.development; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is not set."
  echo "   Please create a .env file with DATABASE_URL pointing to a Postgres database."
  echo "   Example:"
  echo "     DATABASE_URL=postgresql://user:password@localhost:5432/hero_prompt_demo"
  exit 1
fi

# 2. 检查 dump 文件
if [[ ! -f "data/db-demo.sql" ]]; then
  echo "❌ data/db-demo.sql not found."
  echo "   This repo should ship with demo data baked in."
  echo "   If you cloned an old version, pull the latest from the main branch."
  exit 1
fi

# 3. 检查 psql
if ! command -v psql >/dev/null 2>&1; then
  echo "❌ psql is not installed."
  echo "   macOS: brew install postgresql@16   (and add to PATH)"
  echo "   Or use Docker: docker run --rm -i postgres:16 psql \"\$DATABASE_URL\" < data/db-demo.sql"
  exit 1
fi

# 4. 创建 schema（依赖 src/config/db/schema.ts）
echo "[1/3] pushing schema..."
pnpm db:push --force

# 5. 导入数据
echo "[2/3] importing demo data from data/db-demo.sql..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f data/db-demo.sql >/tmp/hero_prompt-init.log 2>&1 \
  || { echo "❌ psql failed; see /tmp/hero_prompt-init.log"; tail -n 50 /tmp/hero_prompt-init.log; exit 1; }
echo "   done."

# 6. 校验 uploads
echo "[3/3] verifying public/uploads/ ..."
UPLOAD_COUNT=$(find public/uploads -type f ! -name '.gitkeep' | wc -l | tr -d ' ')
echo "   found $UPLOAD_COUNT files in public/uploads/"

echo ""
echo "✅ init complete"
echo ""
echo "Next:"
echo "  pnpm dev"
echo "  open http://localhost:3000"
