import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, parsePage } from '../common/pagination';
import { ADMIN_DESK_USER_ORDER, fetchAdminDeskUsers, isAutomationSignup, rankAdminDeskPage } from './admin-users';
import { shouldUseUpstream, upstreamApiUrl } from '../common/upstream';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async users(page = 1, pageSize = 20, q?: string, authorization?: string) {
    if (shouldUseUpstream()) {
      if (!authorization) {
        return rankAdminDeskPage([], page, pageSize, q);
      }
      const rows = await fetchAdminDeskUsers(fetch, upstreamApiUrl(), authorization);
      return rankAdminDeskPage(rows, page, pageSize, q);
    }
    const paging = parsePage(page, pageSize);
    const needle = q?.trim();
    const where = {
      deletedAt: null,
      ...(needle
        ? {
            OR: [
              { email: { contains: needle, mode: 'insensitive' as const } },
              { name: { contains: needle, mode: 'insensitive' as const } },
            ],
          }
        : {
            AND: [
              { NOT: { name: { startsWith: 'Playwright', mode: 'insensitive' as const } } },
              { NOT: { email: { startsWith: 'pw.', mode: 'insensitive' as const } } },
              { NOT: { email: { startsWith: 'pw@', mode: 'insensitive' as const } } },
            ],
          }),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: paging.skip,
        take: paging.take,
        orderBy: ADMIN_DESK_USER_ORDER,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);
    const data = needle ? rows : rows.filter((row) => !isAutomationSignup(row));
    return { data, meta: pageMeta(total, paging.page, paging.pageSize) };
  }

  async setUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }

  async unpublishJob(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return this.prisma.job.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
  }

  async reports(status?: 'OPEN' | 'RESOLVED') {
    return this.prisma.jobReport.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, slug: true, status: true } },
        reporter: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async resolveReport(id: string, status: 'OPEN' | 'RESOLVED') {
    return this.prisma.jobReport.update({ where: { id }, data: { status } });
  }

  async metrics() {
    const [users, jobs, applications] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], where: { deletedAt: null }, _count: true }),
      this.prisma.job.groupBy({ by: ['status'], where: { deletedAt: null }, _count: true }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);
    return {
      users: Object.fromEntries(users.map((row) => [row.role, row._count])),
      jobs: Object.fromEntries(jobs.map((row) => [row.status, row._count])),
      applications: Object.fromEntries(applications.map((row) => [row.status, row._count])),
    };
  }
}
