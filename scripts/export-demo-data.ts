/**
 * [INPUT]: .env.development / .env 中的 DATABASE_URL（用于连 Supabase）。
 * [OUTPUT]:
 *   - data/db-demo.sql           脱敏后的 SQL 数据 dump（R2 URL 已改写为 /uploads/<key>）
 *   - public/uploads/<key>       按 DB 引用下载的 R2 对象（保留原始子目录结构）
 *   - data/export-manifest.json  导出元数据（R2 公开域名/bucket 名已脱敏）
 *   - data/REVIEW.md             可读的导出报告（同上脱敏）
 * [POS]: 项目根目录 scripts/。DB-driven 模式：直接从 DB 收集图片 URL 并按 URL 下载，无需 R2 API 凭据。
 *
 * [PROTOCOL]:
 *   1. 禁止导出: config / apikey / account / session / verification 表。
 *   2. 强制脱敏: user.email/name/image, order/subscription/credit 的邮箱字段。
 *   3. URL 收集: 扫描所有 url/image 相关字段，识别 R2 公开域名为目标。
 *   4. 下载策略: 公网 fetch（非 S3 API），失败标记但不中断。
 *   5. URL 改写: 替换 SQL dump 里出现的 R2 域名为 /uploads/<path>，外链保留。
 *   6. 隐私保护: REVIEW.md 和 manifest 中, R2 公开域名和 bucket 名都脱敏为占位符,
 *      避免推送到公开仓库时暴露生产环境信息。
 *   7. 幂等: 重跑覆盖旧输出文件,图片已存在则跳过下载。
 */

import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { config as loadDotenv } from 'dotenv';
import postgres from 'postgres';

// ---- Load environment ------------------------------------------------------

loadDotenv({ path: '.env.development' });
loadDotenv({ path: '.env', override: false });

// ---- Config ----------------------------------------------------------------

const PROJECT_ROOT = process.cwd();
const DATA_DIR = join(PROJECT_ROOT, 'data');
const UPLOADS_DIR = join(PROJECT_ROOT, 'public', 'uploads');
const SQL_OUT = join(DATA_DIR, 'db-demo.sql');
const MANIFEST_OUT = join(DATA_DIR, 'export-manifest.json');
const REVIEW_OUT = join(DATA_DIR, 'REVIEW.md');

const EXCLUDED_TABLES = new Set<string>([
  'config',
  'apikey',
  'account',
  'session',
  'verification',
  '__drizzle_migrations',
]);

// R2 公开域名识别 (从 DB 读到的 r2_domain 配置; 也兜底匹配 R2 默认域名)
let R2_PUBLIC_DOMAINS: string[] = [];

// R2 bucket 名 (用于从 URL 还原 key, 以及脱敏报告中的真实 bucket 名)
let R2_BUCKET_NAME = '';

// 脱敏占位符: 推送到公开仓库时, REVIEW/manifest 不暴露真实生产域名
const REDACTED_DOMAIN = '<your-r2-public-domain>';
const REDACTED_BUCKET = '<your-r2-bucket>';

// ---- URL 字段名: 这些列里的 URL 会被收集 / 改写 ----
const URL_FIELDS = new Set<string>([
  'image',
  'image_url',
  'imageurl',
  'originalimage',
  'originalimageurl',
  'referenceimageurl',
  'avatar',
  'authoravatar',
  'cover',
  'thumbnail',
  'thumbnailurl',
  'source_url',
  'sourceurl',
  'url',
]);

// ---- Sanitization helpers --------------------------------------------------

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

function hashShort(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 8);
}

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
  if ('paymentUserId' in out) out.paymentUserId = null;
  if ('payment_user_id' in out) out.payment_user_id = null;
  return out;
}

// ---- SQL value formatting --------------------------------------------------

function jsonSafe(v: unknown): string {
  if (v == null) return 'NULL';
  if (typeof v === 'string') {
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
    const trimmed = v.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        JSON.parse(trimmed);
        return `'${escapeSqlString(v)}'::jsonb`;
      } catch {
        /* fall through */
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

// ---- URL extraction & download ---------------------------------------------

interface ExtractedUrl {
  table: string;
  column: string;
  rowId?: string;
  url: string;
  /** 当 url 是 R2 域名时, 这是对应的 R2 key; 否则为 null */
  r2Key: string | null;
}

function isR2PublicUrl(url: string): { key: string; domain: string } | null {
  try {
    const u = new URL(url);
    for (const d of R2_PUBLIC_DOMAINS) {
      if (!d) continue;
      const dUrl = new URL(d);
      if (u.hostname === dUrl.hostname) {
        // path 去掉开头 /
        let p = u.pathname.replace(/^\/+/, '');
        return { key: p, domain: d };
      }
    }
  } catch {
    /* not a valid url */
  }
  return null;
}

function extractUrlsFromRow(
  table: string,
  row: Record<string, any>,
  rowId: string | undefined
): ExtractedUrl[] {
  const out: ExtractedUrl[] = [];
  // 内部闭包: 把任何字符串尝试识别为 URL, 命中则 push
  // 防御: DB 字段如果被错误存成 "keymind/a,https://x/b,https://x/c" 形式 (text[] 当 text 用)
  // 用正则拆分出所有 http(s):// 开头的 URL, 逐个处理
  const collectFromString = (raw: unknown, col: string) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const matches = trimmed.match(/https?:\/\/[^\s,'"`]+/g);
    if (!matches) return;
    for (const m of matches) {
      if (!/^https?:\/\//i.test(m)) continue;
      const r2 = isR2PublicUrl(m);
      out.push({
        table,
        column: col,
        rowId,
        url: m,
        r2Key: r2?.key ?? null,
      });
    }
  };

  for (const [col, val] of Object.entries(row)) {
    if (val == null) continue;
    if (
      !URL_FIELDS.has(col) &&
      !col.toLowerCase().includes('url') &&
      !col.toLowerCase().includes('image')
    ) {
      continue;
    }

    // 1. 单个字符串
    if (typeof val === 'string') {
      collectFromString(val, col);
      continue;
    }

    // 2. 数组 (text[] 类型被 postgres-js 解析为 JS array)
    if (Array.isArray(val)) {
      for (const item of val) {
        collectFromString(item, col);
      }
      continue;
    }

    // 3. 嵌套对象 (json/jsonb) - 递归扫描所有 string 字段
    if (typeof val === 'object') {
      const stack: any[] = [val];
      while (stack.length) {
        const cur = stack.pop();
        for (const v of Object.values(cur)) {
          if (typeof v === 'string') {
            collectFromString(v, col);
          } else if (v && typeof v === 'object') {
            stack.push(v);
          }
        }
      }
    }
  }
  return out;
}

async function fetchToFile(url: string, destAbs: string): Promise<number> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'hero_prompt-demo-exporter/1.0' },
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  await mkdir(dirname(destAbs), { recursive: true });
  // @ts-ignore
  const nodeStream = Readable.fromWeb(res.body);
  await pipeline(nodeStream, createWriteStream(destAbs));
  // 不返回大小,简化
  return 0;
}

// ---- Database export -------------------------------------------------------

interface ExportStats {
  table: string;
  rows: number;
  sanitized: 'none' | 'user' | 'emails' | 'full-skip';
}

interface DownloadStats {
  total: number;
  downloaded: number;
  failed: { key: string; url: string; error: string }[];
}

async function exportDatabase(sql: postgres.Sql): Promise<{
  stats: ExportStats[];
  allUrls: ExtractedUrl[];
}> {
  const tables = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;

  const stats: ExportStats[] = [];
  const allUrls: ExtractedUrl[] = [];
  const sqlChunks: string[] = [];

  sqlChunks.push(
    '-- ============================================================'
  );
  sqlChunks.push('-- hero_prompt demo data dump');
  sqlChunks.push(`-- generated_at: ${new Date().toISOString()}`);
  sqlChunks.push('-- source: Supabase Postgres (sanitized)');
  sqlChunks.push(
    '-- R2 URLs rewritten to /uploads/<key>; external URLs preserved'
  );
  sqlChunks.push(
    '-- ============================================================'
  );
  sqlChunks.push('');
  sqlChunks.push('-- Disable triggers to avoid side effects during import');
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

    // 收集 URL
    for (const row of sanitizedRows) {
      const id = (row.id as string) ?? undefined;
      const found = extractUrlsFromRow(tablename, row, id);
      for (const u of found) allUrls.push(u);
    }

    const cols = Object.keys(sanitizedRows[0]);
    sqlChunks.push(insertStatement(tablename, cols, sanitizedRows));
    sqlChunks.push('');
    stats.push({ table: tablename, rows: rows.length, sanitized: mode });
  }

  sqlChunks.push("SET session_replication_role = 'origin';");
  sqlChunks.push('');

  await writeFile(SQL_OUT, sqlChunks.join('\n'), 'utf8');
  return { stats, allUrls };
}

// ---- R2 url → local download -----------------------------------------------

async function downloadR2Urls(urls: ExtractedUrl[]): Promise<DownloadStats> {
  // 去重 (同一个 R2 key 可能在多行被引用)
  const seen = new Set<string>();
  const unique: ExtractedUrl[] = [];
  for (const u of urls) {
    if (!u.r2Key) continue;
    if (seen.has(u.r2Key)) continue;
    seen.add(u.r2Key);
    unique.push(u);
  }

  const failed: DownloadStats['failed'] = [];
  let downloaded = 0;
  for (let i = 0; i < unique.length; i++) {
    const u = unique[i];
    const dest = join(UPLOADS_DIR, u.r2Key!);
    // 已存在则跳过 (可重复跑)
    try {
      const { stat } = await import('fs/promises');
      await stat(dest);
      downloaded++;
      process.stdout.write(
        `\r[R2] cached  ${i + 1}/${unique.length}: ${u.r2Key}`
      );
      continue;
    } catch {
      /* not cached */
    }

    process.stdout.write(
      `\r[R2] dl ${i + 1}/${unique.length}: ${u.r2Key}                    `
    );
    try {
      await fetchToFile(u.url, dest);
      downloaded++;
    } catch (e) {
      failed.push({
        key: u.r2Key!,
        url: u.url,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  process.stdout.write('\n');
  return { total: unique.length, downloaded, failed };
}

async function rewriteSqlUrls(): Promise<number> {
  const { readFile } = await import('fs/promises');
  const original = await readFile(SQL_OUT, 'utf8');
  let updated = original;
  let count = 0;

  for (const d of R2_PUBLIC_DOMAINS) {
    if (!d) continue;
    // 匹配 d + / + <任意字符, 但不能是 SQL 字符串里的元字符;
    // 简单做法: 把 d 出现的位置之后, 到下一个 ' 或 ", 提取 path
    const re = new RegExp(escapeRegex(d) + '/([^\\s,\\)\\x27\\x22]+)', 'g');
    updated = updated.replace(re, (match, key: string) => {
      count++;
      return `/uploads/${key}`;
    });
  }

  if (count > 0) {
    await writeFile(SQL_OUT, updated, 'utf8');
  }
  return count;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('▶ hero_prompt demo data exporter (DB-driven)');
  console.log('=============================================');

  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOADS_DIR, { recursive: true });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL not set');
  console.log(`[DB] connecting: ${maskUrl(databaseUrl)}`);

  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  await sql`SELECT 1`;

  // 1. 读 r2_domain 配置, 决定哪些 URL 是 R2
  console.log('[cfg] reading r2_domain from config table...');
  const cfgRows = await sql`
    SELECT name, value FROM "config"
    WHERE name IN ('r2_domain', 'r2_bucket_name')
  `;
  const cfgMap: Record<string, string> = {};
  for (const r of cfgRows) cfgMap[r.name] = (r.value ?? '').trim();
  const r2Domain = (cfgMap.r2_domain ?? '').replace(/\/+$/, '');
  R2_BUCKET_NAME = cfgMap.r2_bucket_name ?? '';
  R2_PUBLIC_DOMAINS = [];
  if (r2Domain) R2_PUBLIC_DOMAINS.push(r2Domain);
  // 兜底: 也匹配 r2.cloudflarestorage.com 直接访问的 URL
  R2_PUBLIC_DOMAINS.push('https://r2.cloudflarestorage.com');
  console.log(`[cfg] R2 public domain: ${r2Domain || '(none)'}`);
  console.log(`[cfg] R2 bucket: ${R2_BUCKET_NAME || '(unknown)'}`);

  // 2. 导出 DB + 收集 URL
  console.log('[DB] exporting tables...');
  const { stats, allUrls } = await exportDatabase(sql);
  const exported = stats.filter((s) => s.sanitized !== 'full-skip');
  const totalRows = exported.reduce((s, x) => s + x.rows, 0);
  console.log(`[DB] done: ${exported.length} tables, ${totalRows} rows`);
  console.log(
    `[URL] found ${allUrls.length} URLs total, ${allUrls.filter((u) => u.r2Key).length} pointing to R2`
  );

  // 3. 下载 R2 文件 (按 URL, 无需 R2 API 凭据)
  console.log('[R2] downloading R2 objects via public URL...');
  const dl = await downloadR2Urls(allUrls);
  console.log(
    `[R2] done: ${dl.downloaded}/${dl.total} downloaded${dl.failed.length ? `, ${dl.failed.length} failed` : ''}`
  );
  if (dl.failed.length > 0) {
    console.log('[R2] failures (first 5):');
    for (const f of dl.failed.slice(0, 5))
      console.log(`   - ${f.key}: ${f.error}`);
  }

  // 4. 改写 SQL 中的 R2 域名
  const rewrites = await rewriteSqlUrls();
  console.log(`[sql] URL rewrites applied: ${rewrites}`);

  await sql.end({ timeout: 5 });

  // 5. manifest + REVIEW
  //    脱敏: REVIEW.md 和 manifest 不暴露真实 R2 公开域名和 bucket 名
  //          真实值仅在本地控制台日志中显示, 便于运维核对
  const externalCount = allUrls.filter((u) => !u.r2Key).length;
  const sanitizedFailed = dl.failed.map((f) => ({
    key: f.key,
    error: f.error,
    // 不导出 url (可能含敏感域名)
  }));
  const manifest = {
    exported_at: new Date().toISOString(),
    source: {
      database: 'supabase-postgres',
      r2_public_domain: r2Domain ? REDACTED_DOMAIN : null,
      r2_bucket: R2_BUCKET_NAME ? REDACTED_BUCKET : null,
    },
    database: {
      output_file: 'data/db-demo.sql',
      tables: stats,
      total_tables_exported: exported.length,
      total_rows: totalRows,
    },
    urls: {
      total: allUrls.length,
      r2: dl.total,
      external: externalCount,
    },
    storage: {
      output_dir: 'public/uploads',
      downloaded: dl.downloaded,
      failed: sanitizedFailed,
    },
    url_rewrites: rewrites,
  };
  await writeFile(MANIFEST_OUT, JSON.stringify(manifest, null, 2), 'utf8');
  await writeReview(
    stats,
    dl,
    externalCount,
    rewrites,
    r2Domain,
    R2_BUCKET_NAME
  );

  console.log('');
  console.log('✅ export complete');
  console.log(`   - ${SQL_OUT}`);
  console.log(`   - ${MANIFEST_OUT}`);
  console.log(`   - ${REVIEW_OUT}`);
  console.log(`   - ${UPLOADS_DIR}/ (${dl.downloaded} files)`);
  console.log('');
  console.log('Next:');
  console.log('  git add data/ public/uploads/');
  console.log('  git commit -m "chore(demo): export data snapshot"');
}

function maskUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ':***@');
}

async function writeReview(
  stats: ExportStats[],
  dl: DownloadStats,
  external: number,
  rewrites: number,
  r2Domain: string,
  r2Bucket: string
) {
  const lines: string[] = [];
  lines.push('# Demo Data Export Report');
  lines.push('');
  lines.push(`Generated at: \`${new Date().toISOString()}\``);
  // 脱敏: 不写真实生产域名, 改用占位符
  lines.push(`R2 public domain: \`${r2Domain ? REDACTED_DOMAIN : '(none)'}\``);
  lines.push(`R2 bucket: \`${r2Bucket ? REDACTED_BUCKET : '(unknown)'}\``);
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
  lines.push(`- Downloaded: **${dl.downloaded}** → \`public/uploads/\``);
  lines.push(`- Failed: **${dl.failed.length}**`);
  if (dl.failed.length > 0) {
    lines.push('');
    lines.push('Failed objects:');
    for (const f of dl.failed.slice(0, 50)) {
      lines.push(`- \`${f.key}\`: ${f.error}`);
    }
  }
  lines.push(`- URL rewrites applied in SQL: **${rewrites}**`);
  lines.push(
    `- External URLs preserved: **${external}** (Twitter, CDNs, etc.)`
  );
  lines.push('');

  lines.push('## Safety Guarantees');
  lines.push('');
  lines.push(
    '- `config` table (containing R2/Stripe/OpenAI keys) is **never** exported.'
  );
  lines.push(
    '- `user.email/name/image` are replaced with `user_N@example.com` / `User N` / `null`.'
  );
  lines.push(
    '- `order/subscription/credit` email fields are hashed + suffixed with `@example.com`.'
  );
  lines.push(
    '- `apikey`, `account`, `session`, `verification` tables are excluded entirely.'
  );
  lines.push('- No R2 API credentials are required or read by this script.');
  lines.push('');

  lines.push('## How Clone Users See This Data');
  lines.push('');
  lines.push('1. `pnpm install` and set `DATABASE_URL` in `.env`.');
  lines.push('2. `pnpm db:push` to create schema.');
  lines.push('3. `psql "$DATABASE_URL" < data/db-demo.sql` to load demo data.');
  lines.push(
    '4. Images already in `public/uploads/` and served as `/uploads/...` by Next.js.'
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
