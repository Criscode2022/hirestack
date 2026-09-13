import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import {
  FALLBACK_DATABASE_URL,
  describeDatabaseTarget,
  resolveDatabaseUrl,
  selectPrismaAdapter,
} from '../common/database-target';

neonConfig.webSocketConstructor = ws;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const resolved = resolveDatabaseUrl();
    const connectionString = resolved.url ?? FALLBACK_DATABASE_URL;
    const kind = describeDatabaseTarget(connectionString);
    const adapterKind = selectPrismaAdapter(Boolean(process.env.VERCEL), kind);
    const log = process.env.NODE_ENV === 'production' ? (['error'] as const) : (['query', 'warn', 'error'] as const);
    if (adapterKind === 'prisma-tcp') {
      super({
        datasources: { db: { url: connectionString } },
        log: ['error'],
      });
      return;
    }
    super({
      adapter: new PrismaNeon({ connectionString }),
      log: [...log],
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
