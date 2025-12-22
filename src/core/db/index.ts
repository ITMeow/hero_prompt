import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { isCloudflareWorker } from '@/shared/lib/env';

// Global database connection instance (singleton pattern)
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;
let client: ReturnType<typeof postgres> | null = null;

export function db() {
  let databaseUrl = envConfigs.database_url;

  let isHyperdrive = false;

  if (isCloudflareWorker) {
    const { env }: { env: any } = { env: {} };
    // Detect if set Hyperdrive
    isHyperdrive = 'HYPERDRIVE' in env;

    if (isHyperdrive) {
      const hyperdrive = env.HYPERDRIVE;
      databaseUrl = hyperdrive.connectionString;
      console.log('using Hyperdrive connection');
    }
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  // In Cloudflare Workers, create new connection each time
  if (isCloudflareWorker) {
    console.log('in Cloudflare Workers environment');
    // Workers environment uses minimal configuration
    const client = postgres(databaseUrl, {
      prepare: false,
      max: 1, // Limit to 1 connection in Workers
      idle_timeout: 10, // Shorter timeout for Workers
      connect_timeout: 5,
    });

    return drizzle(client, { schema });
  }

  // Singleton mode: reuse existing connection (good for traditional servers and serverless warm starts)
  if (envConfigs.db_singleton_enabled === 'true') {
    // Return existing instance if already initialized
    if (dbInstance) {
      return dbInstance;
    }

    // Create connection pool only once
    client = postgres(databaseUrl, {
      prepare: false,
      max: Number(envConfigs.db_max_connections) || 1, // Maximum connections in pool (default 1)
      idle_timeout: 30, // Idle connection timeout (seconds)
      connect_timeout: 10, // Connection timeout (seconds)
    });

    dbInstance = drizzle(client, { schema });
    return dbInstance;
  }

  // Non-singleton mode: create new connection each time (good for serverless)
  // In serverless, the connection will be cleaned up when the function instance is destroyed
  const serverlessClient = postgres(databaseUrl, {
    prepare: false,
    max: 1, // Use single connection in serverless
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(serverlessClient, { schema });
}

// Optional: Function to close database connection (useful for testing or graceful shutdown)
// Note: Only works in singleton mode
export async function closeDb() {
  if (envConfigs.db_singleton_enabled && client) {
    await client.end();
    client = null;
    dbInstance = null;
  }
}
