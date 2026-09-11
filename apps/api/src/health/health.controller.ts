import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  databaseHostname,
  describeDatabaseTarget,
  sanitizeDbError,
  selectPrismaAdapter,
} from '../common/database-target';

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
    return {
      ok: true,
      db,
      dbError,
      dbHostKind: describeDatabaseTarget(),
      dbHost: databaseHostname(),
      dbAdapter: selectPrismaAdapter(),
      service: 'hirestack-api',
      time: new Date().toISOString(),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasJwt: Boolean(process.env.JWT_ACCESS_SECRET),
    };
  }
}
