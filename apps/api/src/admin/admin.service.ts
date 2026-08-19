import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, parsePage } from '../common/pagination';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async users(page = 1, pageSize = 20, q?: string) {
    const paging = parsePage(page, pageSize);
    const where = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' as const } },
              { name: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: paging.skip,
        take: paging.take,
        orderBy: { createdAt: 'desc' },
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
