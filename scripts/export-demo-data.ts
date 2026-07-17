/**
 * [INPUT]: .env.development / .env 中的 DATABASE_URL（Supabase 连接串），以及 Supabase `config` 表中的 R2 凭据。
 * [OUTPUT]:
 *   - data/db-demo.sql           脱敏后的 SQL 数据 dump
 *   - public/uploads/<key>       从 R2 下载的所有对象（保留原 key 路径）
 *   - data/export-manifest.json  导出元数据（无敏感信息）
 *   - data/REVIEW.md             可读的导出报告（哪些表脱敏/排除/导出多少行）
 * [POS]: 项目根目录 scripts/，用于把 Supabase 数据库 + Cloudflare R2 对象存储拉回仓库，让 clone 用户启动后即可看到全部采集数据。
 *
 * [PROTOCOL]:
 *   1. 禁止导出: `config`（含 R2/Stripe/OpenAI 等密钥）、`apikey`、`account`、`session`、`verification`。
 *   2. 强制脱敏: `user.email/name/image` → 占位值；`order/subscription/credit` 的 userEmail/paymentEmail/paymentUserName → 占位。
 *   3. URL 改写: SQL 中指向 R2 公开域名的 URL → `/uploads/<key>`；外链（twitter、cdn 等）保持原样。
 *   4. 行为幂等: 同一目录重复运行,会覆盖输出文件,不会重复追加。
 *   5. 失败中止: 任一关键步骤失败,立刻退出,不清空已写入的旧数据(便于排查)。
 *   6. 不删除源: 仅下载 R2 对象,不在 R2 上做任何删除操作。
 */

import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { config as loadDotenv } from 'dotenv';
import postgres from 'postgres';

// ---- Load environment ------------------------------------------------------

// [INPUT] 仅读 .env.development / .env 中已存在的变量,不会创建或覆盖任何 env 文件。
loadDotenv({ path: '.env.development' });
loadDotenv({ path: '.env', override: false });

// ---- Config ----------------------------------------------------------------

const PROJECT_ROOT = process.cwd();
const DATA_DIR = join(PROJECT_ROOT, 'data');
const UPLOADS_DIR = join(PROJECT_ROOT, 'public', 'uploads');
const SQL_OUT = join(DATA_DIR, 'db-demo.sql');
const MANIFEST_OUT = join(DATA_DIR, 'export-manifest.json');
const REVIEW_OUT = join(DATA_DIR, 'REVIEW.md');

// 严格排除: 这些表绝对不能出现在 dump 中（含密钥或无意义数据）
const EXCLUDED_TABLES = new Set<string>([
  'config', // 全部密钥（r2_*, stripe_*, openai_*, etc.）
  'apikey', // 用户的 API key
  'account', // OAuth 凭据
  'session', // 会话 token
  'verification', // 验证 token
  '__drizzle_migrations', // 框架迁移历史
]);

// 脱敏规则: user 表强制脱敏
function sanitizeUser(
  row: Record<string, any>,
  idx: number
): Record<string, any> {
  return {
    ...row,
    name: `User ${idx + 1}`,
    email: `user_${idx + 1}@example.com`,
    email_verified: false,
    image: null,
  };
}

// 脱敏规则: 订单/订阅/积分 表的邮箱字段
function sanitizeEmails(row: Record<string, any>): Record<string, any> {
  const emailFields = [
    'userEmail',
    'user_email',
    'paymentEmail',
    'payment_email',
    'paymentUserName',
    'payment_user_name',
  ];
  const out: Record<string, any> = { ...row };
  for (const f of emailFields) {
    if (out[f] != null)
      out[f] = `demo+${hashShort(String(out[f]))}@example.com`;
  }
  // 订单的支付姓名/用户 ID 也清掉以避免关联到真实账号
  if ('paymentUserId' in out) out.paymentUserId = null;
  if ('payment_user_id' in out) out.payment_user_id = null;
  return out;
}

function hashShort(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 8);
}

// JSON 字段安全序列化: postgres 驱动有时把 jsonb 解析成对象,有时是字符串
function jsonSafe(v: unknown): string {
  if (v == null) return 'NULL';
  if (typeof v === 'string') {
    // 可能是 JSON 字符串或纯文本
    try {
      JSON.parse(v);
      return `'${escapeSqlString(v)}'::jsonb`;
    } catch {
      return `'${escapeSqlString(v)}'`;
    }
  }
  return `'${escapeSqlString(JSON.stringify(v))}'::jsonb`;
}

function escapeSqlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\0/g, '\\0');
}

function sqlValue(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'bigint') return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === 'object') return jsonSafe(v);
  if (typeof v === 'string') {
    // 检测是否为 JSON 字符串
    const trimmed = v.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        JSON.parse(trimmed);
        return `'${escapeSqlString(v)}'::jsonb`;
      } catch {
        // 不是合法 JSON, 当文本
      }
    }
    return `'${escapeSqlString(v)}'`;
  }
  return `'${escapeSqlString(String(v))}'`;
}

function insertStatement(
  table: string,
  cols: string[],
  rows: Record<string, any>[]
): string {
  if (rows.length === 0) return `-- (no rows for ${table})\n`;
  const colList = cols.map((c) => `"${c}"`).join(', ');
  const values = rows
    .map((r) => `  (${cols.map((c) => sqlValue(r[c])).join(', ')})`)
    .join(',\n');
  return `INSERT INTO "${table}" (${colList}) VALUES\n${values};\n`;
}

// ---- Database export -------------------------------------------------------

interface ExportStats {
  table: string;
  rows: number;
  sanitized: 'none' | 'user' | 'emails' | 'full-skip';
}

async function exportDatabase(sql: postgres.Sql): Promise<ExportStats[]> {
  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;

  const stats: ExportStats[] = [];
  const sqlChunks: string[] = [];

  sqlChunks.push(
    '-- ============================================================'
  );
  sqlChunks.push('-- hero_prompt demo data dump');
  sqlChunks.push(`-- generated_at: ${new Date().toISOString()}`);
  sqlChunks.push('-- source: Supabase Postgres (sanitized)');
  sqlChunks.push('-- DO NOT include secrets, account data, or session data');
  sqlChunks.push(
    '-- ============================================================'
  );
  sqlChunks.push('');
  sqlChunks.push(
    '-- Disable triggers to avoid double-encryption / audit log side effects'
  );
  sqlChunks.push("SET session_replication_role = 'replica';");
  sqlChunks.push('');

  for (const { tablename } of tables) {
    if (EXCLUDED_TABLES.has(tablename)) {
      stats.push({ table: tablename, rows: 0, sanitized: 'full-skip' });
      sqlChunks.push(`-- SKIPPED (sensitive): ${tablename}`);
      continue;
    }

    const rows = await sql.unsafe(`SELECT * FROM "${tablename}"`);
    if (rows.length === 0) {
      stats.push({ table: tablename, rows: 0, sanitized: 'none' });
      sqlChunks.push(`-- (empty): ${tablename}`);
      continue;
    }

    sqlChunks.push(`-- Table: ${tablename} (${rows.length} rows)`);
    sqlChunks.push(`TRUNCATE TABLE "${tablename}" CASCADE;`);

    let sanitizedRows = rows as Record<string, any>[];
    let mode: 'none' | 'user' | 'emails' = 'none';

    if (tablename === 'user') {
      sanitizedRows = rows.map((r, i) => sanitizeUser(r, i));
      mode = 'user';
    } else if (
      tablename === 'order' ||
      tablename === 'subscription' ||
      tablename === 'credit'
    ) {
      sanitizedRows = rows.map((r) => sanitizeEmails(r));
      mode = 'emails';
    }

    const cols = Object.keys(sanitizedRows[0]);
    sqlChunks.push(insertStatement(tablename, cols, sanitizedRows));
    sqlChunks.push('');

    stats.push({ table: tablename, rows: rows.length, sanitized: mode });
  }

  sqlChunks.push("SET session_replication_role = 'origin';");
  sqlChunks.push('');

  await writeFile(SQL_OUT, sqlChunks.join('\n'), 'utf8');
  return stats;
}

// ---- R2 download -----------------------------------------------------------

interface R2Configs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  uploadPath: string;
  publicDomain: string;
  endpoint: string;
}

interface DownloadResult {
  totalListed: number;
  downloaded: number;
  skipped: number;
  failed: { key: string; error: string }[];
  urlRewrites: { from: string; to: string }[];
}

async function fetchR2Configs(sql: postgres.Sql): Promise<R2Configs | null> {
  const rows = await sql`
    SELECT name, value FROM "config"
    WHERE name IN (
      'r2_account_id', 'r2_access_key', 'r2_secret_key',
      'r2_bucket_name', 'r2_domain', 'r2_endpoint', 'r2_upload_path'
    )
  `;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.name] = r.value ?? '';

  if (!map.r2_access_key || !map.r2_secret_key || !map.r2_bucket_name) {
    return null;
  }

  // account_id 可能没存, 从 endpoint URL 提取
  let accountId = map.r2_account_id ?? '';
  if (!accountId && map.r2_endpoint) {
    const m = map.r2_endpoint.match(
      /https?:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/i
    );
    if (m && m[1]) accountId = m[1];
  }
  if (!accountId) {
    throw new Error(
      'Cannot determine r2_account_id. Please set either r2_account_id or r2_endpoint in DB config table.'
    );
  }

  return {
    accountId,
    accessKeyId: map.r2_access_key,
    secretAccessKey: map.r2_secret_key,
    bucket: map.r2_bucket_name,
    uploadPath: (map.r2_upload_path ?? 'uploads').replace(/^\/+|\/+$/g, ''),
    publicDomain: (map.r2_domain ?? '').replace(/\/+$/, ''),
    endpoint: map.r2_endpoint ?? '',
  };
}

async function listAllR2Keys(cfg: R2Configs): Promise<string[]> {
  const { AwsClient } = await import('aws4fetch');
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: 'auto',
  });

  const endpoint =
    cfg.endpoint || `https://${cfg.accountId}.r2.cloudflarestorage.com`;

  // 列出 bucket 下所有对象 (不强加 prefix, 因为真实数据可能跨多个 prefix: heroprompt/, keymind/, ...)
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const qs = new URLSearchParams({ 'list-type': '2' });
    if (continuationToken) qs.set('continuation-token', continuationToken);
    const url = `${endpoint}/${cfg.bucket}?${qs.toString()}`;

    const res = await client.fetch(url, { method: 'GET' });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `R2 ListObjectsV2 failed ${res.status}: ${body.slice(0, 500)}`
      );
    }
    const xml = await res.text();

    // S3 ListObjectsV2 返回的 <Key> 元素可能带后缀 / 表示目录占位; 只保留有 size 的真实对象
    // 解析 <Contents> 块, 同时拿 Key 和 Size
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let m: RegExpExecArray | null;
    while ((m = contentRegex.exec(xml)) !== null) {
      const block = m[1];
      const keyMatch = block.match(/<Key>([^<]+)<\/Key>/);
      const sizeMatch = block.match(/<Size>(\d+)<\/Size>/);
      if (!keyMatch) continue;
      const key = decodeURIComponent(keyMatch[1]);
      const size = sizeMatch ? Number(sizeMatch[1]) : 0;
      // 跳过 0 字节的目录占位条目
      if (size === 0 && key.endsWith('/')) continue;
      keys.push(key);
    }

    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const next = xml.match(
      /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/
    );
    continuationToken = truncated && next ? next[1] : undefined;
  } while (continuationToken);

  return keys;
}

async function downloadR2Object(cfg: R2Configs, key: string): Promise<void> {
  const { AwsClient } = await import('aws4fetch');
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: 'auto',
  });
  const endpoint =
    cfg.endpoint || `https://${cfg.accountId}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${cfg.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

  const res = await client.fetch(url, { method: 'GET' });
  if (!res.ok || !res.body) {
    throw new Error(`R2 GET ${key} failed: ${res.status}`);
  }

  // 下载到 public/uploads/<full key>, 保留原始子目录结构 (keymind/, heroprompt/, ...)
  const dest = join(UPLOADS_DIR, key);
  await mkdir(dirname(dest), { recursive: true });
  // @ts-ignore: node 18+ Readable.fromWeb
  const nodeStream = Readable.fromWeb(res.body as any);
  await pipeline(nodeStream, createWriteStream(dest));
}

async function downloadAllR2(cfg: R2Configs): Promise<{
  keys: string[];
  downloaded: number;
  failed: { key: string; error: string }[];
}> {
  const keys = await listAllR2Keys(cfg);
  let downloaded = 0;
  const failed: { key: string; error: string }[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    process.stdout.write(`\r[R2] downloading ${i + 1}/${keys.length}: ${key}`);
    try {
      await downloadR2Object(cfg, key);
      downloaded++;
    } catch (e) {
      failed.push({ key, error: e instanceof Error ? e.message : String(e) });
    }
  }
  process.stdout.write('\n');
  return { keys, downloaded, failed };
}

function buildUrlRewrites(
  cfg: R2Configs,
  keys: string[]
): { from: string; to: string }[] {
  const rewrites: { from: string; to: string }[] = [];
  const publicDomains = new Set<string>();
  if (cfg.publicDomain) publicDomains.add(cfg.publicDomain);
  publicDomains.add(
    `https://${cfg.bucket}.${cfg.accountId}.r2.cloudflarestorage.com`
  );
  publicDomains.add(
    `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}`
  );

  // 用完整 R2 key 改写, 不剥 upload_path, 保留目录结构 (heroprompt/, keymind/, ...)
  for (const key of keys) {
    const to = `/uploads/${key}`;
    for (const domain of publicDomains) {
      rewrites.push({ from: `${domain}/${key}`, to });
    }
  }
  return rewrites;
}

async function rewriteSqlUrls(
  rewrites: { from: string; to: string }[]
): Promise<number> {
  if (rewrites.length === 0) return 0;
  const original = await import('fs/promises').then((m) =>
    m.readFile(SQL_OUT, 'utf8')
  );
  let updated = original;
  let count = 0;
  for (const r of rewrites) {
    if (updated.includes(r.from)) {
      updated = updated.split(r.from).join(r.to);
      count++;
    }
  }
  if (count > 0) {
    await writeFile(SQL_OUT, updated, 'utf8');
  }
  return count;
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('▶ hero_prompt demo data exporter');
  console.log('=====================================');

  // 1. 准备目录
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOADS_DIR, { recursive: true });

  // 2. 校验连接
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set in .env.development / .env');
  }
  console.log(`[DB] connecting: ${maskUrl(databaseUrl)}`);
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  try {
    await sql`SELECT 1`;
  } catch (e) {
    throw new Error(
      `Cannot connect to Supabase: ${e instanceof Error ? e.message : e}`
    );
  }

  // 3. 导出数据库
  console.log('[DB] exporting tables...');
  const stats = await exportDatabase(sql);
  const exportedTables = stats.filter((s) => s.sanitized !== 'full-skip');
  const totalRows = exportedTables.reduce((sum, s) => sum + s.rows, 0);
  console.log(
    `[DB] done: ${exportedTables.length} tables, ${totalRows} rows → ${SQL_OUT}`
  );

  // 4. R2 配置
  console.log('[R2] reading config from DB...');
  const r2Cfg = await fetchR2Configs(sql);

  let downloadInfo: DownloadResult;
  if (!r2Cfg) {
    console.log('[R2] skipped: r2_* not configured in DB config table');
    downloadInfo = {
      totalListed: 0,
      downloaded: 0,
      skipped: 0,
      failed: [],
      urlRewrites: [],
    };
  } else {
    console.log(
      `[R2] bucket: ${r2Cfg.bucket}, public_domain: ${r2Cfg.publicDomain || '(none)'}`
    );
    console.log('[R2] listing objects...');
    const { keys, downloaded, failed } = await downloadAllR2(r2Cfg);
    console.log(
      `[R2] done: ${downloaded}/${keys.length} downloaded${failed.length ? `, ${failed.length} failed` : ''}`
    );

    const rewrites = buildUrlRewrites(r2Cfg, keys);
    const rewriteCount = await rewriteSqlUrls(rewrites);
    console.log(`[R2] URL rewrites applied: ${rewriteCount}`);
    downloadInfo = {
      totalListed: keys.length,
      downloaded,
      skipped: 0,
      failed,
      urlRewrites: rewrites,
    };
  }

  await sql.end({ timeout: 5 });

  // 5. 写 manifest
  const manifest = {
    exported_at: new Date().toISOString(),
    source: {
      database: 'supabase-postgres',
      storage: r2Cfg ? 'cloudflare-r2' : 'none',
      r2_bucket: r2Cfg?.bucket ?? null,
    },
    database: {
      output_file: 'data/db-demo.sql',
      tables: stats,
      total_tables_exported: exportedTables.length,
      total_rows: totalRows,
    },
    storage: {
      output_dir: 'public/uploads',
      total_listed: downloadInfo.totalListed,
      downloaded: downloadInfo.downloaded,
      failed: downloadInfo.failed,
    },
    url_rewrites: downloadInfo.urlRewrites.length,
  };
  await writeFile(MANIFEST_OUT, JSON.stringify(manifest, null, 2), 'utf8');

  // 6. 写 REVIEW.md
  await writeReview(stats, downloadInfo, manifest.url_rewrites);

  console.log('');
  console.log('✅ export complete');
  console.log(`   - ${SQL_OUT}`);
  console.log(`   - ${MANIFEST_OUT}`);
  console.log(`   - ${REVIEW_OUT}`);
  console.log(`   - ${UPLOADS_DIR}/ (${downloadInfo.downloaded} files)`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. git add data/ public/uploads/');
  console.log('  2. git commit -m "chore(demo): export data snapshot"');
  console.log(
    '  3. Users who clone this repo will get the demo data via public/uploads/ + data/db-demo.sql'
  );
}

function maskUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ':***@');
}

async function writeReview(
  stats: ExportStats[],
  storage: DownloadResult,
  urlRewriteCount: number
) {
  const lines: string[] = [];
  lines.push('# Demo Data Export Report');
  lines.push('');
  lines.push(`Generated at: \`${new Date().toISOString()}\``);
  lines.push('');

  lines.push('## Database');
  lines.push('');
  lines.push('| Table | Rows | Treatment |');
  lines.push('|---|---:|---|');
  for (const s of stats) {
    const treatment =
      s.sanitized === 'full-skip'
        ? '⛔ skipped (sensitive)'
        : s.sanitized === 'user'
          ? '✅ exported (PII sanitized)'
          : s.sanitized === 'emails'
            ? '✅ exported (emails sanitized)'
            : '✅ exported as-is';
    lines.push(`| \`${s.table}\` | ${s.rows} | ${treatment} |`);
  }
  lines.push('');

  lines.push('## Object Storage (R2)');
  lines.push('');
  lines.push(`- Listed: **${storage.totalListed}** objects`);
  lines.push(`- Downloaded: **${storage.downloaded}** → \`public/uploads/\``);
  lines.push(`- Failed: **${storage.failed.length}**`);
  if (storage.failed.length > 0) {
    lines.push('');
    lines.push('Failed objects:');
    for (const f of storage.failed.slice(0, 50)) {
      lines.push(`- \`${f.key}\`: ${f.error}`);
    }
  }
  lines.push(`- URL rewrites applied in SQL: **${urlRewriteCount}**`);
  lines.push('');

  lines.push('## Safety Guarantees');
  lines.push('');
  lines.push(
    '- The `config` table (containing R2/Stripe/OpenAI/etc. keys) is **never** exported.'
  );
  lines.push(
    '- All `user.email` and `user.name` are replaced with `user_N@example.com` / `User N`.'
  );
  lines.push('- `user.image` is cleared.');
  lines.push(
    '- `order/subscription/credit` email fields are hashed + suffixed with `@example.com`.'
  );
  lines.push(
    '- `apikey`, `account`, `session`, `verification` tables are excluded entirely.'
  );
  lines.push('');
  lines.push('## How Clone Users See This Data');
  lines.push('');
  lines.push(
    '1. They run `pnpm install` and copy `.env.example` to `.env` (or set `DATABASE_URL`).'
  );
  lines.push('2. They run `pnpm db:push` to create the schema.');
  lines.push(
    '3. They run `psql "$DATABASE_URL" < data/db-demo.sql` to load demo data.'
  );
  lines.push(
    '4. Images are already in `public/uploads/` and served as `/uploads/...` by Next.js.'
  );
  lines.push('');

  await writeFile(REVIEW_OUT, lines.join('\n'), 'utf8');
}

main().catch((err) => {
  console.error('');
  console.error('❌ export failed:');
  console.error(err);
  process.exit(1);
});
