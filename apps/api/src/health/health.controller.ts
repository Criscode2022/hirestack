import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

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
      if (error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code) {
        dbError = String((error as { code: unknown }).code);
      } else if (error instanceof Error) {
        dbError = error.name;
      }
    }
    return {
      ok: true,
      db,
      dbError,
      service: 'hirestack-api',
      time: new Date().toISOString(),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasJwt: Boolean(process.env.JWT_ACCESS_SECRET),
    };
  }
}
