import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JobSort, JobStatus, UserRole, skillMatchPercent } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { buildJobSearchQuery, queryFlag } from './job-search.query';
import { pageMeta, parsePage } from '../common/pagination';
import { uniqueSlug } from '../common/slug';
import { UpsertJobDto } from './dto/job.dto';
import type { JobSearchQuery } from '@hirestack/shared';
import type { RequestUser } from '../common/types/request-user';
import { BillingService } from '../billing/billing.service';
import { countPipeline, mergeJobPipelines } from '../applications/dashboard-view';
import { shouldUseUpstream, upstreamApiUrl } from '../common/upstream';
import { applyFeaturedOverlay, overlayFeaturedFlag, parseFeaturedIds, setFeaturedOverlay } from '../common/featured-overlay';

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
  featured: true,
  company: { select: { id: true, name: true, slug: true, logoUrl: true } },
  skills: { include: { skill: { select: { id: true, slug: true, name: true } } } },
} satisfies Prisma.JobSelect;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async search(
    query: JobSearchQuery,
    cookie?: string,
    featuredHeader?: string,
    originalUrl?: string,
    viewer?: RequestUser,
  ) {
    if (shouldUseUpstream()) {
      return this.overlayUpstream(originalUrl || '/api/jobs', cookie, featuredHeader);
    }
    const built = buildJobSearchQuery(query);
    const { skip, take, page, pageSize } = parsePage(built.page, built.pageSize);
    const viewerState = await this.candidateBoardState(viewer);
    const hideApplied = queryFlag(query.hideApplied) && viewerState.appliedIds.length > 0;
    const exclude = hideApplied ? viewerState.appliedIds : [];
    const where = exclude.length ? { AND: [built.where, { id: { notIn: exclude } }] } : built.where;

    if (built.q && built.sort === JobSort.RELEVANCE) {
      const excluded = exclude.length
        ? Prisma.sql`AND j.id NOT IN (${Prisma.join(exclude)})`
        : Prisma.empty;
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
          ${excluded}
        ORDER BY j.featured DESC, rank DESC, j."publishedAt" DESC NULLS LAST
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
          ${excluded}
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
        data: ordered.map((job) => this.serializeCard(job!, this.matchFor(job!, viewerState.skillIds))),
        meta: pageMeta(Number(totalRows[0]?.count ?? 0), page, pageSize),
      };
    }

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        orderBy: built.orderBy,
        skip,
        take,
        select: listSelect,
      }),
    ]);
    return {
      data: jobs.map((job) => this.serializeCard(job, this.matchFor(job, viewerState.skillIds))),
      meta: pageMeta(total, page, pageSize),
    };
  }

  async getBySlug(slug: string, cookie?: string, featuredHeader?: string, viewer?: RequestUser) {
    if (shouldUseUpstream()) {
      return this.overlayUpstream(`/api/jobs/${encodeURIComponent(slug)}`, cookie, featuredHeader);
    }
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
    const viewerState = await this.candidateBoardState(viewer);
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
    return {
      ...job,
      matchPercent: this.matchFor(job, viewerState.skillIds),
      similar: similar.map((item) => this.serializeCard(item, this.matchFor(item, viewerState.skillIds))),
    };
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
    if (job.status !== 'PUBLISHED') {
      await this.billing.assertCanPublish(ownerId, job.id);
    }
    return this.prisma.job.update({
      where: { id: job.id },
      data: { status: 'PUBLISHED', publishedAt: job.publishedAt ?? new Date() },
    });
  }

  async feature(
    ownerId: string,
    jobId: string,
    featured: boolean,
    authorization?: string,
    cookie?: string,
    featuredHeader?: string,
  ) {
    if (shouldUseUpstream()) {
      return this.featureOnUpstream(ownerId, jobId, featured, authorization, cookie, featuredHeader);
    }
    const job = await this.requireOwnedJob(ownerId, jobId);
    if (featured) {
      await this.billing.assertCanFeature(ownerId, job.id);
    }
    return this.prisma.job.update({
      where: { id: job.id },
      data: {
        featured,
        featuredUntil: featured ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      },
    });
  }

  private async featureOnUpstream(
    ownerId: string,
    jobId: string,
    featured: boolean,
    authorization?: string,
    cookie?: string,
    featuredHeader?: string,
  ) {
    if (!authorization) {
      throw new ForbiddenException('Authentication required');
    }
    const jobsRes = await fetch(`${upstreamApiUrl()}/api/me/jobs`, { headers: { authorization } });
    if (!jobsRes.ok) {
      throw new ForbiddenException('Could not load hiring desk jobs');
    }
    const jobsJson = await jobsRes.json();
    const jobs = Array.isArray(jobsJson) ? jobsJson : [];
    const owned = jobs.find((job: { id?: string }) => job.id === jobId) as
      | { id: string; featured?: boolean; status?: string }
      | undefined;
    if (!owned) {
      throw new NotFoundException('Job not found');
    }
    const extra = parseFeaturedIds(cookie, featuredHeader);
    const already = overlayFeaturedFlag(jobId, owned.featured, extra);
    if (featured && !already) {
      const workspace = await this.billing.workspace(ownerId, authorization, cookie, featuredHeader);
      if (!workspace.canFeature) {
        throw new ForbiddenException('Upgrade to feature more listings');
      }
    }
    setFeaturedOverlay(jobId, featured);
    return { ...owned, featured };
  }

  async close(ownerId: string, jobId: string) {
    const job = await this.requireOwnedJob(ownerId, jobId);
    return this.prisma.job.update({
      where: { id: job.id },
      data: { status: 'CLOSED' },
    });
  }

  async mine(ownerId: string, authorization?: string, cookie?: string, featuredHeader?: string) {
    if (shouldUseUpstream()) {
      if (!authorization) {
        throw new ForbiddenException('Authentication required');
      }
      const jobsRes = await fetch(`${upstreamApiUrl()}/api/me/jobs`, { headers: { authorization } });
      if (!jobsRes.ok) {
        throw new ForbiddenException('Could not load hiring desk jobs');
      }
      const jobsJson = await jobsRes.json();
      const overlaid = applyFeaturedOverlay(jobsJson, parseFeaturedIds(cookie, featuredHeader));
      return this.attachUpstreamPipelines(overlaid, authorization);
    }
    const company = await this.requireCompany(ownerId);
    const rows = await this.prisma.job.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        ...listSelect,
        _count: { select: { applications: true } },
        applications: { where: { deletedAt: null }, select: { status: true } },
      },
    });
    return rows.map(({ applications, ...job }) => ({
      ...job,
      pipeline: countPipeline(applications),
    }));
  }

  async getOwned(
    ownerId: string,
    jobId: string,
    authorization?: string,
    cookie?: string,
    featuredHeader?: string,
  ) {
    const extra = parseFeaturedIds(cookie, featuredHeader);
    if (shouldUseUpstream()) {
      if (!authorization) {
        throw new ForbiddenException('Authentication required');
      }
      const jobsRes = await fetch(`${upstreamApiUrl()}/api/me/jobs`, { headers: { authorization } });
      if (!jobsRes.ok) {
        throw new ForbiddenException('Could not load hiring desk jobs');
      }
      const jobsJson = await jobsRes.json();
      const jobs = Array.isArray(jobsJson) ? jobsJson : [];
      const owned = jobs.find((job: { id?: string }) => job.id === jobId) as
        | {
            id: string;
            slug?: string;
            title?: string;
            descriptionMd?: string;
            employmentType?: string;
            workplace?: string;
            location?: string | null;
            seniority?: string;
            salaryMin?: number | null;
            salaryMax?: number | null;
            currency?: string;
            status?: string;
            featured?: boolean;
            skills?: Array<{ slug: string; name?: string; weight?: string }>;
          }
        | undefined;
      if (!owned) {
        throw new NotFoundException('Job not found');
      }
      let detail: Record<string, unknown> = { ...owned };
      if (owned.slug) {
        const publicRes = await fetch(`${upstreamApiUrl()}/api/jobs/${encodeURIComponent(owned.slug)}`);
        if (publicRes.ok) {
          const body: unknown = await publicRes.json();
          if (body && typeof body === 'object' && !Array.isArray(body)) {
            detail = { ...(body as Record<string, unknown>), ...owned };
          }
        }
      }
      return applyFeaturedOverlay(
        {
          id: owned.id,
          slug: owned.slug,
          title: owned.title ?? '',
          descriptionMd: typeof detail['descriptionMd'] === 'string' ? detail['descriptionMd'] : '',
          employmentType: owned.employmentType ?? detail['employmentType'] ?? 'FULL_TIME',
          workplace: owned.workplace ?? detail['workplace'] ?? 'REMOTE',
          location: owned.location ?? (detail['location'] as string | null | undefined) ?? null,
          seniority: owned.seniority ?? detail['seniority'] ?? 'MID',
          salaryMin: owned.salaryMin ?? (detail['salaryMin'] as number | null | undefined) ?? null,
          salaryMax: owned.salaryMax ?? (detail['salaryMax'] as number | null | undefined) ?? null,
          currency: owned.currency ?? (detail['currency'] as string | undefined) ?? 'USD',
          status: owned.status ?? 'DRAFT',
          featured: overlayFeaturedFlag(owned.id, owned.featured, extra),
          skills: Array.isArray(owned.skills)
            ? owned.skills
            : Array.isArray(detail['skills'])
              ? detail['skills']
              : [],
        },
        extra,
      );
    }
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null, company: { ownerId } },
      include: { skills: { include: { skill: true } } },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return {
      id: job.id,
      slug: job.slug,
      title: job.title,
      descriptionMd: job.descriptionMd,
      employmentType: job.employmentType,
      workplace: job.workplace,
      location: job.location,
      seniority: job.seniority,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      status: job.status,
      featured: overlayFeaturedFlag(job.id, job.featured, extra),
      skills: job.skills.map((row) => ({
        slug: row.skill.slug,
        name: row.skill.name,
        weight: row.weight,
      })),
    };
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

  async recommended(userId: string) {
    const [skills, applied] = await Promise.all([
      this.prisma.userSkill.findMany({ where: { userId } }),
      this.prisma.application.findMany({
        where: { candidateId: userId, deletedAt: null },
        select: { jobId: true },
      }),
    ]);
    const skillIds = skills.map((row) => row.skillId);
    const appliedIds = applied.map((row) => row.jobId);
    const matched = await this.prisma.job.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        ...(appliedIds.length ? { id: { notIn: appliedIds } } : {}),
        ...(skillIds.length ? { skills: { some: { skillId: { in: skillIds } } } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      select: listSelect,
    });
    const ranked = matched
      .map((job) => this.serializeCard(job, this.matchFor(job, skillIds)))
      .sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0))
      .slice(0, 4);
    if (ranked.length >= 4) {
      return ranked;
    }
    const extra = await this.prisma.job.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        id: { notIn: [...appliedIds, ...matched.map((job) => job.id)] },
      },
      orderBy: { publishedAt: 'desc' },
      take: 4 - ranked.length,
      select: listSelect,
    });
    return [...ranked, ...extra.map((job) => this.serializeCard(job, this.matchFor(job, skillIds)))];
  }

  async featured(cookie?: string, featuredHeader?: string) {
    if (shouldUseUpstream()) {
      return this.overlayUpstream('/api/jobs/featured', cookie, featuredHeader);
    }
    const jobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      take: 6,
      select: listSelect,
    });
    return jobs.map((job) => this.serializeCard(job));
  }

  private async overlayUpstream(path: string, cookie?: string, featuredHeader?: string) {
    const response = await fetch(`${upstreamApiUrl()}${path}`);
    if (!response.ok) {
      throw new NotFoundException('Could not load jobs from the marketplace API');
    }
    return applyFeaturedOverlay(await response.json(), parseFeaturedIds(cookie, featuredHeader));
  }

  private async attachUpstreamPipelines(payload: unknown, authorization?: string) {
    if (!Array.isArray(payload) || !authorization) {
      return payload;
    }
    const pipelines: Record<string, Record<string, number>> = {};
    await Promise.all(
      payload.map(async (job) => {
        if (!job || typeof job !== 'object') {
          return;
        }
        const id = (job as { id?: string }).id;
        if (!id) {
          return;
        }
        try {
          const res = await fetch(`${upstreamApiUrl()}/api/jobs/${encodeURIComponent(id)}/applications`, {
            headers: { authorization },
          });
          if (!res.ok) {
            return;
          }
          const rows: unknown = await res.json();
          if (Array.isArray(rows)) {
            pipelines[id] = countPipeline(rows as Array<{ status?: string }>);
          }
        } catch {
          // Keep the hiring-desk row without a per-job pipeline overlay.
        }
      }),
    );
    return mergeJobPipelines(payload, pipelines);
  }

  private async candidateBoardState(viewer?: RequestUser) {
    if (viewer?.role !== UserRole.CANDIDATE) {
      return { skillIds: [] as string[], appliedIds: [] as string[] };
    }
    const [skills, applied] = await Promise.all([
      this.prisma.userSkill.findMany({ where: { userId: viewer.id }, select: { skillId: true } }),
      this.prisma.application.findMany({
        where: { candidateId: viewer.id, deletedAt: null },
        select: { jobId: true },
      }),
    ]);
    return {
      skillIds: skills.map((row) => row.skillId),
      appliedIds: applied.map((row) => row.jobId),
    };
  }

  private matchFor(
    job: { skills: Array<{ skill: { id?: string } }> },
    skillIds: string[],
  ) {
    if (!skillIds.length) {
      return undefined;
    }
    return skillMatchPercent(
      skillIds,
      job.skills.map((row) => row.skill.id).filter((id): id is string => Boolean(id)),
    ) ?? undefined;
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
    featured?: boolean;
    company: { id: string; name: string; slug: string; logoUrl: string | null };
    skills: Array<{ weight: string; skill: { id?: string; slug: string; name: string } }>;
  }, matchPercent?: number) {
    return {
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
      featured: Boolean(job.featured),
      company: job.company,
      skills: job.skills.map((s) => ({ slug: s.skill.slug, name: s.skill.name, weight: s.weight })),
      ...(matchPercent != null ? { matchPercent } : {}),
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
