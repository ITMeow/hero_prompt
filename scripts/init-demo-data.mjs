// [INPUT] 用户启动 demo 时可选传入命令行参数 --docker 表示自动起一个本地 postgres 容器。
// [OUTPUT] 在本机或用户指定的 Postgres 中创建 schema 并导入 data/db-demo.sql。
// [POS] 跨平台的 demo 数据初始化入口，mac/linux 都可执行。

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const root = process.cwd();

function log(...args) {
  console.log(...args);
}

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function loadEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

async function prompt(question, defaultValue = '') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      `${question}${defaultValue ? ` [${defaultValue}]` : ''}: `,
      (answer) => {
        rl.close();
        resolve((answer || defaultValue).trim());
      }
    );
  });
}

function maskUrl(url) {
  return url.replace(/:[^:@/]+@/, ':***@');
}

async function main() {
  log('▶ hero_prompt demo data initializer (Node)');
  log('===========================================');
  loadEnv();

  let dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl) {
    if (process.argv.includes('--docker')) {
      log('[docker] starting a local postgres:16 container...');
      execSync(
        'docker run -d --name hero_prompt_pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hero_prompt postgres:16',
        { stdio: 'inherit' }
      );
      dbUrl = 'postgresql://postgres:postgres@localhost:5432/hero_prompt';
      log('   waiting for postgres to be ready...');
      execSync(
        'until docker exec hero_prompt_pg pg_isready -U postgres; do sleep 1; done',
        {
          stdio: 'inherit',
        }
      );
    } else {
      dbUrl = await prompt(
        'DATABASE_URL not set. Enter your Postgres connection string\n(or pass --docker to start a local one)',
        'postgresql://postgres:postgres@localhost:5432/hero_prompt'
      );
    }
  }
  log(`[db] target: ${maskUrl(dbUrl)}`);

  const dumpPath = join(root, 'data', 'db-demo.sql');
  if (!existsSync(dumpPath)) {
    die('data/db-demo.sql not found. Please pull the latest from main branch.');
  }

  log('[1/3] pushing schema (pnpm db:push --force)...');
  const pushRes = spawnSync('pnpm', ['db:push', '--force'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  if (pushRes.status !== 0) die('pnpm db:push failed');

  log('[2/3] importing data/db-demo.sql...');
  const psqlRes = spawnSync(
    'psql',
    [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', dumpPath],
    {
      stdio: 'inherit',
    }
  );
  if (psqlRes.status !== 0) die('psql import failed');

  log('[3/3] verifying public/uploads/ ...');
  try {
    const out = execSync(
      "find public/uploads -type f ! -name '.gitkeep' | wc -l",
      {
        cwd: root,
        encoding: 'utf8',
      }
    ).trim();
    log(`   found ${out} files in public/uploads/`);
  } catch {
    log('   (could not count files, but the directory exists)');
  }

  log('');
  log('✅ init complete');
  log('');
  log('Next:');
  log('  pnpm dev');
  log('  open http://localhost:3000');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
