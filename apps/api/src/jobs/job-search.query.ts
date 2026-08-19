import { Prisma } from '@prisma/client';
import {
  EmploymentType,
  JobSort,
  Seniority,
  Workplace,
  type JobSearchQuery,
} from '@hirestack/shared';

export interface NormalizedJobSearch {
  where: Prisma.JobWhereInput;
  orderBy: Prisma.JobOrderByWithRelationInput[];
  page: number;
  pageSize: number;
  q?: string;
  sort: JobSort;
}

const ENUM_WORKPLACE = new Set<string>(Object.values(Workplace));
const ENUM_TYPE = new Set<string>(Object.values(EmploymentType));
const ENUM_SENIORITY = new Set<string>(Object.values(Seniority));

export function buildJobSearchQuery(input: JobSearchQuery): NormalizedJobSearch {
  const page = Math.max(1, Number(input.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(input.pageSize ?? 12)));
  const q = input.q?.trim() || undefined;
  const sort = (input.sort as JobSort) || (q ? JobSort.RELEVANCE : JobSort.NEWEST);

  const and: Prisma.JobWhereInput[] = [
    { status: 'PUBLISHED', deletedAt: null },
  ];

  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { descriptionMd: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
        { skills: { some: { skill: { name: { contains: q, mode: 'insensitive' } } } } },
      ],
    });
  }

  if (input.location?.trim()) {
    and.push({ location: { contains: input.location.trim(), mode: 'insensitive' } });
  }
  if (input.workplace && ENUM_WORKPLACE.has(input.workplace)) {
    and.push({ workplace: input.workplace });
  }
  if (input.type && ENUM_TYPE.has(input.type)) {
    and.push({ employmentType: input.type });
  }
  if (input.seniority && ENUM_SENIORITY.has(input.seniority)) {
    and.push({ seniority: input.seniority });
  }
  if (input.salaryMin != null) {
    and.push({ salaryMax: { gte: Number(input.salaryMin) } });
  }
  if (input.salaryMax != null) {
    and.push({ salaryMin: { lte: Number(input.salaryMax) } });
  }
  if (input.skills?.trim()) {
    const slugs = input.skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (slugs.length) {
      and.push({
        skills: { some: { skill: { slug: { in: slugs } } } },
      });
    }
  }
  if (input.postedWithinDays != null) {
    const since = new Date();
    since.setDate(since.getDate() - Number(input.postedWithinDays));
    and.push({ publishedAt: { gte: since } });
  }

  const orderBy: Prisma.JobOrderByWithRelationInput[] =
    sort === JobSort.SALARY
      ? [{ salaryMax: { sort: 'desc', nulls: 'last' } }, { publishedAt: 'desc' }]
      : [{ publishedAt: 'desc' }];

  return { where: { AND: and }, orderBy, page, pageSize, q, sort };
}

export function relevanceSqlRank(alias: string, q: string): Prisma.Sql {
  return Prisma.sql`(
    similarity(${Prisma.raw(`${alias}."title"`)}, ${q}) * 2
    + similarity(coalesce(${Prisma.raw(`${alias}."location"`)}, ''), ${q})
  )`;
}
