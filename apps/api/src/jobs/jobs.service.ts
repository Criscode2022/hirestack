import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JobSort, JobStatus } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { buildJobSearchQuery } from './job-search.query';
import { pageMeta, parsePage } from '../common/pagination';
import { uniqueSlug } from '../common/slug';
import { UpsertJobDto } from './dto/job.dto';
import type { JobSearchQuery } from '@hirestack/shared';

const listSelect = {
  id: true,
  slug: true,
  title: true,
  location: true,
  workplace: true,
  employmentType: true,
  seniority: true,
  salaryMin: true,
  salaryMax: true,
  currency: true,
  publishedAt: true,
  status: true,
  company: { select: { id: true, name: true, slug: true, logoUrl: true } },
  skills: { include: { skill: { select: { slug: true, name: true } } } },
} satisfies Prisma.JobSelect;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: JobSearchQuery) {
    const built = buildJobSearchQuery(query);
    const { skip, take, page, pageSize } = parsePage(built.page, built.pageSize);

    if (built.q && built.sort === JobSort.RELEVANCE) {
      const rows = await this.prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT j.id,
          (similarity(j.title, ${built.q}) * 2
            + similarity(coalesce(j.location, ''), ${built.q})) AS rank
        FROM "Job" j
        WHERE j.status = 'PUBLISHED' AND j."deletedAt" IS NULL
          AND (
            j.title ILIKE ${'%' + built.q + '%'}
            OR coalesce(j.location, '') ILIKE ${'%' + built.q + '%'}
            OR j."descriptionMd" ILIKE ${'%' + built.q + '%'}
          )
        ORDER BY rank DESC, j."publishedAt" DESC NULLS LAST
        LIMIT ${take} OFFSET ${skip}
      `;
      const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) AS count
        FROM "Job" j
        WHERE j.status = 'PUBLISHED' AND j."deletedAt" IS NULL
          AND (
            j.title ILIKE ${'%' + built.q + '%'}
            OR coalesce(j.location, '') ILIKE ${'%' + built.q + '%'}
            OR j."descriptionMd" ILIKE ${'%' + built.q + '%'}
          )
      `;
      const ids = rows.map((r) => r.id);
      const data = ids.length
        ? await this.prisma.job.findMany({
            where: { id: { in: ids } },
            select: listSelect,
          })
        : [];
      const ordered = ids.map((id) => data.find((job) => job.id === id)).filter(Boolean);
      return {
        data: ordered.map((job) => this.serializeCard(job!)),
        meta: pageMeta(Number(totalRows[0]?.count ?? 0), page, pageSize),
      };
    }

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where: built.where }),
      this.prisma.job.findMany({
        where: built.where,
        orderBy: built.orderBy,
        skip,
        take,
        select: listSelect,
      }),
    ]);
    return {
      data: jobs.map((job) => this.serializeCard(job)),
      meta: pageMeta(total, page, pageSize),
    };
  }

  async getBySlug(slug: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug, deletedAt: null, status: { in: ['PUBLISHED', 'CLOSED'] } },
      include: {
        company: true,
        skills: { include: { skill: true } },
      },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    const similar = await this.prisma.job.findMany({
      where: {
        id: { not: job.id },
        deletedAt: null,
        status: 'PUBLISHED',
        OR: [
          { workplace: job.workplace },
          { employmentType: job.employmentType },
          { skills: { some: { skillId: { in: job.skills.map((s) => s.skillId) } } } },
        ],
      },
      take: 4,
      select: listSelect,
      orderBy: { publishedAt: 'desc' },
    });
    return { ...job, similar: similar.map((item) => this.serializeCard(item)) };
  }

  async create(ownerId: string, dto: UpsertJobDto) {
    this.assertSalary(dto);
    const company = await this.requireCompany(ownerId);
    const skills = await this.resolveSkills(dto.skills);
    return this.prisma.job.create({
      data: {
        companyId: company.id,
        title: dto.title,
        slug: uniqueSlug(dto.title),
        descriptionMd: dto.descriptionMd,
        employmentType: dto.employmentType,
        workplace: dto.workplace,
        location: dto.workplace === 'REMOTE' ? dto.location ?? null : dto.location ?? null,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        currency: dto.currency ?? 'USD',
        seniority: dto.seniority,
        status: JobStatus.DRAFT,
        skills: { create: skills },
      },
      include: { skills: { include: { skill: true } } },
    });
  }

  async update(ownerId: string, jobId: string, dto: UpsertJobDto) {
    this.assertSalary(dto);
    const job = await this.requireOwnedJob(ownerId, jobId);
    const skills = await this.resolveSkills(dto.skills);
    return this.prisma.$transaction(async (tx) => {
      await tx.jobSkill.deleteMany({ where: { jobId: job.id } });
      return tx.job.update({
        where: { id: job.id },
        data: {
          title: dto.title,
          descriptionMd: dto.descriptionMd,
          employmentType: dto.employmentType,
          workplace: dto.workplace,
          location: dto.location,
          salaryMin: dto.salaryMin,
          salaryMax: dto.salaryMax,
          currency: dto.currency ?? job.currency,
          seniority: dto.seniority,
          skills: { create: skills },
        },
        include: { skills: { include: { skill: true } } },
      });
    });
  }

  async publish(ownerId: string, jobId: string) {
    const job = await this.requireOwnedJob(ownerId, jobId);
    return this.prisma.job.update({
      where: { id: job.id },
      data: { status: 'PUBLISHED', publishedAt: job.publishedAt ?? new Date() },
    });
  }

  async close(ownerId: string, jobId: string) {
    const job = await this.requireOwnedJob(ownerId, jobId);
    return this.prisma.job.update({
      where: { id: job.id },
      data: { status: 'CLOSED' },
    });
  }

  async mine(ownerId: string) {
    const company = await this.requireCompany(ownerId);
    return this.prisma.job.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { ...listSelect, _count: { select: { applications: true } } },
    });
  }

  async save(userId: string, jobId: string) {
    await this.requirePublished(jobId);
    await this.prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId } },
      update: {},
      create: { userId, jobId },
    });
    return { saved: true };
  }

  async unsave(userId: string, jobId: string) {
    await this.prisma.savedJob.deleteMany({ where: { userId, jobId } });
    return { saved: false };
  }

  async savedJobs(userId: string) {
    const rows = await this.prisma.savedJob.findMany({
      where: { userId, job: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: { job: { select: listSelect } },
    });
    return rows.map((row) => this.serializeCard(row.job));
  }

  async listSavedSearches(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createSavedSearch(userId: string, name: string, queryJson: Prisma.JsonObject) {
    return this.prisma.savedSearch.create({ data: { userId, name, queryJson } });
  }

  async deleteSavedSearch(userId: string, id: string) {
    await this.prisma.savedSearch.deleteMany({ where: { id, userId } });
    return { ok: true };
  }

  async featured() {
    const jobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      select: listSelect,
    });
    return jobs.map((job) => this.serializeCard(job));
  }

  private serializeCard(job: {
    id: string;
    slug: string;
    title: string;
    location: string | null;
    workplace: string;
    employmentType: string;
    seniority: string;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string;
    publishedAt: Date | null;
    company: { id: string; name: string; slug: string; logoUrl: string | null };
    skills: Array<{ weight: string; skill: { slug: string; name: string } }>;
  }) {
    return {
      ...job,
      skills: job.skills.map((s) => ({ slug: s.skill.slug, name: s.skill.name, weight: s.weight })),
    };
  }

  private assertSalary(dto: UpsertJobDto) {
    if (dto.salaryMin != null && dto.salaryMax != null && dto.salaryMin > dto.salaryMax) {
      throw new BadRequestException('salaryMin must be less than or equal to salaryMax');
    }
    if (dto.workplace !== 'REMOTE' && !dto.location) {
      throw new BadRequestException('Location is required unless the job is remote');
    }
  }

  private async requireCompany(ownerId: string) {
    const company = await this.prisma.company.findUnique({ where: { ownerId } });
    if (!company) {
      throw new ForbiddenException('Create a company before posting jobs');
    }
    return company;
  }

  private async requireOwnedJob(ownerId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null, company: { ownerId } },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  private async requirePublished(jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null, status: 'PUBLISHED' },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  private async resolveSkills(skills: UpsertJobDto['skills']) {
    const records = await this.prisma.skill.findMany({
      where: { slug: { in: skills.map((s) => s.slug) } },
    });
    if (records.length !== skills.length) {
      throw new BadRequestException('One or more skills are unknown');
    }
    return skills.map((s) => ({
      skillId: records.find((r) => r.slug === s.slug)!.id,
      weight: s.weight ?? 'REQUIRED',
    }));
  }
}
