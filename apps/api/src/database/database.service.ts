import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@repo/db';
import { PrismaPg } from '@prisma/adapter-pg';

/** Auto-generated docstring */
@Injectable()
export class DatabaseService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({
      adapter,
    });
  }
}
