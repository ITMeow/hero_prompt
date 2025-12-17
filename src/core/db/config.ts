import { defineConfig } from 'drizzle-kit';

import { envConfigs } from '@/config';

export default defineConfig({
  out: './src/config/db/migrations',
  schema: './src/config/db/schema.ts',
  dialect: envConfigs.database_provider as
    | 'sqlite'
    | 'postgresql'
    | 'mysql'
    | 'turso'
    | 'singlestore'
    | 'gel',
  dbCredentials: {
    url: envConfigs.database_url ?? '',
  },
});
