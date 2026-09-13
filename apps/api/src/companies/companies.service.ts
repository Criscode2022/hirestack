import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { skillMatchPercent, UserRole } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { slugify } from '../common/slug';
import type { RequestUser } from '../common/types/request-user';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({ where: { ownerId } });
    if (existing) {
      throw new ConflictException('Employer already has a company');
    }
    const base = slugify(dto.name);
    let slug = base;
    let n = 1;
    while (await this.prisma.company.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    return this.prisma.company.create({
      data: { ownerId, ...dto, slug },
    });
  }

  async list() {
    const rows = await this.prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            followers: true,
            jobs: { where: { status: 'PUBLISHED', deletedAt: null } },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      industry: row.industry,
      headquarters: row.headquarters,
      employeeCount: row.employeeCount,
      logoUrl: row.logoUrl,
      description: row.description,
      followerCount: row._count.followers,
      openJobs: row._count.jobs,
    }));
  }

  async getBySlug(slug: string, viewer?: RequestUser) {
    const company = await this.prisma.company.findUnique({
      where: { slug },
      include: {
        jobs: {
          where: { status: 'PUBLISHED', deletedAt: null },
          orderBy: { publishedAt: 'desc' },
          select: {
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
            skills: { include: { skill: true } },
          },
        },
        _count: { select: { followers: true, jobs: true } },
        owner: { select: { id: true, name: true, headline: true } },
      },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    const skillIds =
      viewer?.role === UserRole.CANDIDATE
        ? (
            await this.prisma.userSkill.findMany({
              where: { userId: viewer.id },
              select: { skillId: true },
            })
          ).map((row) => row.skillId)
        : [];
    return {
      ...company,
      jobs: company.jobs.map((job) => {
        const matchPercent = skillIds.length
          ? skillMatchPercent(
              skillIds,
              job.skills.map((row) => row.skill.id),
            )
          : null;
        return {
          ...job,
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
            logoUrl: company.logoUrl,
          },
          skills: job.skills.map((s) => ({
            slug: s.skill.slug,
            name: s.skill.name,
            weight: s.weight,
          })),
          ...(matchPercent != null ? { matchPercent } : {}),
        };
      }),
    };
  }

  async update(id: string, ownerId: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    if (company.ownerId !== ownerId) {
      throw new ForbiddenException('Only the company owner can edit this profile');
    }
    return this.prisma.company.update({ where: { id }, data: dto });
  }
}
