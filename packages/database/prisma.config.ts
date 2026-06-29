import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Migrations/seed run from this package; load the same env the app uses.
// `prisma generate` does not need a live URL, so read it tolerantly via
// process.env (undefined is fine for generate/build; migrations require it set).
config({ path: '.env.local' });
config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seeders/index.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
