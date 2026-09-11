import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const FALLBACK_DATABASE_URL = 'postgresql://127.0.0.1:65535/hirestack_unconfigured';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL || FALLBACK_DATABASE_URL;
    process.env.DATABASE_URL ??= connectionString;
    process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;
    const adapter = new PrismaNeon({ connectionString });
    super({
      adapter,
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.error('Prisma connect failed', error instanceof Error ? error.message : error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
