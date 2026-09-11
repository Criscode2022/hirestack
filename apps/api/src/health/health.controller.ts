import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  databaseEnvFlags,
  databaseHostname,
  describeDatabaseTarget,
  resolveDatabaseUrl,
  sanitizeDbError,
  selectPrismaAdapter,
} from '../common/database-target';
import { shouldUseUpstream, upstreamApiUrl } from '../common/upstream';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    let db = false;
    let dbError: string | undefined;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch (error) {
      db = false;
      dbError = sanitizeDbError(error);
    }
    const resolved = resolveDatabaseUrl();
    return {
      ok: true,
      db,
      dbError,
      dbHostKind: describeDatabaseTarget(),
      dbHost: databaseHostname(),
      dbAdapter: selectPrismaAdapter(),
      dbSource: resolved.source,
      databaseEnv: databaseEnvFlags(),
      service: 'hirestack-api',
      time: new Date().toISOString(),
      hasDatabaseUrl: Boolean(resolved.url),
      hasJwt: Boolean(process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET),
      upstreamMode: shouldUseUpstream(),
      upstream: shouldUseUpstream() ? upstreamApiUrl() : undefined,
    };
  }
}
