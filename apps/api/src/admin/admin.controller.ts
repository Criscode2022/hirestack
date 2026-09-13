import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@hirestack/shared';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('q') q?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.admin.users(page, pageSize, q, authorization);
  }

  @Patch('users/:id')
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' },
  ) {
    return this.admin.setUserStatus(id, body.status);
  }

  @Post('jobs/:id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.admin.unpublishJob(id);
  }

  @Get('reports')
  reports(@Query('status') status?: 'OPEN' | 'RESOLVED') {
    return this.admin.reports(status);
  }

  @Patch('reports/:id')
  resolve(
    @Param('id') id: string,
    @Body() body: { status: 'OPEN' | 'RESOLVED' },
  ) {
    return this.admin.resolveReport(id, body.status);
  }

  @Get('metrics')
  metrics() {
    return this.admin.metrics();
  }
}

@ApiTags('reports')
@Controller()
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiBearerAuth()
  @Post('jobs/:id/report')
  async report(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.prisma.jobReport.create({
      data: { jobId: id, reporterId: user.id, reason: body.reason },
    });
  }

  @Public()
  @Get('skills')
  skills() {
    return this.prisma.skill.findMany({ orderBy: { name: 'asc' } });
  }
}
