import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  BillingPlan,
  canFeatureMore,
  canPublishMore,
  planCatalogItem,
  BILLING_PLAN_CATALOG,
} from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { shouldUseUpstream, upstreamApiUrl } from '../common/upstream';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return {
      plans: BILLING_PLAN_CATALOG,
      checkoutMode: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo',
      currency: 'USD',
    };
  }

  async workspace(ownerId: string, authorization?: string) {
    if (shouldUseUpstream()) {
      return this.workspaceFromUpstream(authorization);
    }
    const company = await this.prisma.company.findUnique({ where: { ownerId } });
    if (!company) {
      throw new NotFoundException('Create a company before managing billing');
    }
    const [publishedJobs, featuredJobs] = await Promise.all([
      this.prisma.job.count({
        where: { companyId: company.id, status: 'PUBLISHED', deletedAt: null },
      }),
      this.prisma.job.count({
        where: { companyId: company.id, featured: true, status: 'PUBLISHED', deletedAt: null },
      }),
    ]);
    const plan = planCatalogItem(company.plan);
    return {
      companyId: company.id,
      companyName: company.name,
      plan: company.plan,
      planName: plan.name,
      monthlyUsd: plan.monthlyUsd,
      checkoutMode: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo',
      usage: {
        publishedJobs,
        publishedLimit: plan.publishedJobs,
        featuredJobs,
        featuredLimit: plan.featuredJobs,
      },
      canPublish: canPublishMore(company.plan, publishedJobs),
      canFeature: canFeatureMore(company.plan, featuredJobs),
    };
  }

  async subscribe(ownerId: string, plan: BillingPlan, authorization?: string) {
    if (shouldUseUpstream()) {
      const workspace = await this.workspaceFromUpstream(authorization);
      const item = planCatalogItem(plan);
      return {
        ...workspace,
        plan,
        planName: item.name,
        monthlyUsd: item.monthlyUsd,
        canPublish: canPublishMore(plan, workspace.usage.publishedJobs),
        canFeature: canFeatureMore(plan, workspace.usage.featuredJobs),
      };
    }
    const company = await this.prisma.company.findUnique({ where: { ownerId } });
    if (!company) {
      throw new NotFoundException('Create a company before choosing a plan');
    }
    await this.prisma.company.update({
      where: { id: company.id },
      data: { plan },
    });
    const featuredLimit = planCatalogItem(plan).featuredJobs;
    if (featuredLimit >= 0) {
      const featured = await this.prisma.job.findMany({
        where: { companyId: company.id, featured: true, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });
      const extra = featured.slice(featuredLimit);
      if (extra.length) {
        await this.prisma.job.updateMany({
          where: { id: { in: extra.map((row) => row.id) } },
          data: { featured: false, featuredUntil: null },
        });
      }
    }
    return this.workspace(ownerId);
  }

  async assertCanPublish(ownerId: string, jobId?: string) {
    const company = await this.requireCompany(ownerId);
    const published = await this.prisma.job.count({
      where: {
        companyId: company.id,
        status: 'PUBLISHED',
        deletedAt: null,
        ...(jobId ? { id: { not: jobId } } : {}),
      },
    });
    if (!canPublishMore(company.plan, published)) {
      throw new ForbiddenException(
        `The ${planCatalogItem(company.plan).name} plan allows ${planCatalogItem(company.plan).publishedJobs} published job(s). Upgrade to post more.`,
      );
    }
    return company;
  }

  async assertCanFeature(ownerId: string, jobId: string) {
    const company = await this.requireCompany(ownerId);
    const featured = await this.prisma.job.count({
      where: {
        companyId: company.id,
        featured: true,
        deletedAt: null,
        id: { not: jobId },
      },
    });
    if (!canFeatureMore(company.plan, featured)) {
      throw new ForbiddenException(
        `The ${planCatalogItem(company.plan).name} plan allows ${planCatalogItem(company.plan).featuredJobs} featured listing(s). Upgrade to feature more roles.`,
      );
    }
    return company;
  }

  private async workspaceFromUpstream(authorization?: string) {
    if (!authorization) {
      throw new UnauthorizedException('Authentication required');
    }
    const meRes = await fetch(`${upstreamApiUrl()}/api/me`, { headers: { authorization } });
    if (!meRes.ok) {
      throw new UnauthorizedException('Authentication required');
    }
    const me = (await meRes.json()) as {
      id: string;
      company?: { id?: string; name?: string };
    };
    const jobsRes = await fetch(`${upstreamApiUrl()}/api/me/jobs`, { headers: { authorization } });
    const jobsJson = jobsRes.ok ? await jobsRes.json() : [];
    const jobs = Array.isArray(jobsJson) ? jobsJson : [];
    const publishedJobs = jobs.filter((job: { status?: string }) => job.status === 'PUBLISHED').length;
    const featuredJobs = jobs.filter((job: { featured?: boolean }) => job.featured).length;
    const plan = BillingPlan.GROWTH;
    const item = planCatalogItem(plan);
    return {
      companyId: me.company?.id ?? me.id,
      companyName: me.company?.name ?? 'Hiring workspace',
      plan,
      planName: item.name,
      monthlyUsd: item.monthlyUsd,
      checkoutMode: 'demo' as const,
      usage: {
        publishedJobs,
        publishedLimit: item.publishedJobs,
        featuredJobs,
        featuredLimit: item.featuredJobs,
      },
      canPublish: canPublishMore(plan, publishedJobs),
      canFeature: canFeatureMore(plan, featuredJobs),
    };
  }

  private async requireCompany(ownerId: string) {
    const company = await this.prisma.company.findUnique({ where: { ownerId } });
    if (!company) {
      throw new ForbiddenException('Create a company before posting jobs');
    }
    return company;
  }
}
