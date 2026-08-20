import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q?: string) {
    const query = q?.trim();
    const [jobs, people, companies] = await Promise.all([
      this.prisma.job.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          ...(query
            ? {
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { location: { contains: query, mode: 'insensitive' } },
                  { skills: { some: { skill: { name: { contains: query, mode: 'insensitive' } } } } },
                ],
              }
            : {}),
        },
        take: 8,
        orderBy: { publishedAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, slug: true, logoUrl: true } },
          skills: { include: { skill: { select: { slug: true, name: true } } } },
        },
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { headline: { contains: query, mode: 'insensitive' } },
                  { userSkills: { some: { skill: { name: { contains: query, mode: 'insensitive' } } } } },
                ],
              }
            : {}),
        },
        take: 8,
        select: {
          id: true,
          name: true,
          headline: true,
          location: true,
          openToWork: true,
          role: true,
          company: { select: { id: true, name: true, slug: true } },
          userSkills: { include: { skill: { select: { slug: true, name: true } } } },
        },
      }),
      this.prisma.company.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { industry: { contains: query, mode: 'insensitive' } },
                { headquarters: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {},
        take: 6,
        include: { _count: { select: { followers: true, jobs: true } } },
      }),
    ]);
    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        slug: job.slug,
        title: job.title,
        location: job.location,
        workplace: job.workplace,
        employmentType: job.employmentType,
        seniority: job.seniority,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        publishedAt: job.publishedAt,
        company: job.company,
        skills: job.skills.map((row) => ({ slug: row.skill.slug, name: row.skill.name, weight: row.weight })),
      })),
      people: people.map((row) => ({
        id: row.id,
        name: row.name,
        headline: row.headline,
        location: row.location,
        openToWork: row.openToWork,
        role: row.role,
        company: row.company,
        skills: row.userSkills.map((item) => item.skill),
      })),
      companies: companies.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        industry: row.industry,
        headquarters: row.headquarters,
        employeeCount: row.employeeCount,
        logoUrl: row.logoUrl,
        followerCount: row._count.followers,
        openJobs: row._count.jobs,
      })),
    };
  }

  async tape() {
    const [jobs, posts] = await Promise.all([
      this.prisma.job.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        orderBy: { publishedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          slug: true,
          title: true,
          publishedAt: true,
          company: { select: { name: true } },
        },
      }),
      this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          kind: true,
          body: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      }),
    ]);
    const items = [
      ...jobs.map((job) => ({
        kind: 'JOB' as const,
        id: job.id,
        label: `${job.company.name} listed ${job.title}`,
        href: `/jobs/${job.slug}`,
        createdAt: job.publishedAt ?? new Date(),
      })),
      ...posts.map((post) => ({
        kind: post.kind === 'HIRING' ? ('HIRE' as const) : ('POST' as const),
        id: post.id,
        label: `${post.author.name}: ${post.body.slice(0, 72)}`,
        href: '/feed',
        createdAt: post.createdAt,
      })),
    ]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 16);
    return items;
  }

  async salaries() {
    const jobs = await this.prisma.job.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        salaryMin: { gte: 1000 },
        employmentType: { in: ['FULL_TIME', 'PART_TIME'] },
      },
      include: { skills: { include: { skill: true } } },
    });
    const bySkill = new Map<string, { mins: number[]; maxes: number[]; currency: string }>();
    for (const job of jobs) {
      for (const row of job.skills) {
        const bucket = bySkill.get(row.skill.name) ?? { mins: [], maxes: [], currency: job.currency };
        if (job.salaryMin) bucket.mins.push(job.salaryMin);
        if (job.salaryMax) bucket.maxes.push(job.salaryMax);
        bySkill.set(row.skill.name, bucket);
      }
    }
    return [...bySkill.entries()]
      .map(([skill, bucket]) => ({
        skill,
        roleCount: bucket.mins.length,
        salaryMin: bucket.mins.length ? Math.round(bucket.mins.reduce((a, b) => a + b, 0) / bucket.mins.length) : null,
        salaryMax: bucket.maxes.length ? Math.round(bucket.maxes.reduce((a, b) => a + b, 0) / bucket.maxes.length) : null,
        currency: bucket.currency,
      }))
      .sort((a, b) => b.roleCount - a.roleCount)
      .slice(0, 12);
  }
}
