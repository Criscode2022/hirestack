import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, assertLegalTransition, NotificationType, UserRole } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApplyDto, TransitionDto } from './dto/apply.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async apply(candidateId: string, jobId: string, dto: ApplyDto) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null, status: 'PUBLISHED' },
      include: { company: { include: { owner: true } } },
    });
    if (!job) {
      throw new NotFoundException('Job is not open for applications');
    }
    const resume = await this.prisma.resume.findFirst({
      where: { id: dto.resumeId, userId: candidateId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    const duplicate = await this.prisma.application.findUnique({
      where: { jobId_candidateId: { jobId, candidateId } },
    });
    if (duplicate && !duplicate.deletedAt) {
      throw new ConflictException('You have already applied to this job');
    }

    const application = await this.prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          jobId,
          candidateId,
          resumeId: dto.resumeId,
          coverLetter: dto.coverLetter,
          status: ApplicationStatus.SUBMITTED,
        },
      });
      await tx.applicationEvent.create({
        data: {
          applicationId: created.id,
          fromStatus: null,
          toStatus: ApplicationStatus.SUBMITTED,
          actorId: candidateId,
          note: dto.coverLetter,
          isPublic: false,
        },
      });
      return created;
    });

    const candidate = await this.prisma.user.findUniqueOrThrow({ where: { id: candidateId } });
    await this.notifications.push(job.company.ownerId, {
      type: NotificationType.APPLICATION_UPDATE,
      title: `${candidate.name} applied to ${job.title}`,
      body: 'A new candidate entered your pipeline.',
      href: `/employer/jobs/${job.id}/inbox`,
    });
    await this.mail.send(
      candidate.email,
      `Application received: ${job.title}`,
      `<p>We received your application for <strong>${job.title}</strong> at ${job.company.name}.</p>`,
    );
    return application;
  }

  async mine(candidateId: string) {
    return this.prisma.application.findMany({
      where: { candidateId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            company: { select: { name: true, slug: true, logoUrl: true } },
          },
        },
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            isPublic: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async withdraw(candidateId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, candidateId, deletedAt: null },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    assertLegalTransition(application.status, ApplicationStatus.WITHDRAWN, 'CANDIDATE');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: application.id },
        data: { status: ApplicationStatus.WITHDRAWN, withdrawnAt: new Date() },
      });
      await tx.applicationEvent.create({
        data: {
          applicationId: application.id,
          fromStatus: application.status,
          toStatus: ApplicationStatus.WITHDRAWN,
          actorId: candidateId,
          note: 'Candidate withdrew',
          isPublic: true,
        },
      });
      return updated;
    });
  }

  async forJob(
    ownerId: string,
    jobId: string,
    filters: { status?: ApplicationStatus; skill?: string; from?: string },
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, company: { ownerId }, deletedAt: null },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return this.prisma.application.findMany({
      where: {
        jobId,
        deletedAt: null,
        status: filters.status,
        createdAt: filters.from ? { gte: new Date(filters.from) } : undefined,
        candidate: filters.skill
          ? { userSkills: { some: { skill: { slug: filters.skill } } } }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            headline: true,
            location: true,
            email: true,
            userSkills: { include: { skill: true } },
          },
        },
        resume: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async transition(actorId: string, role: UserRole, applicationId: string, dto: TransitionDto) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: {
        job: { include: { company: true } },
        candidate: true,
      },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    const actor: 'EMPLOYER' | 'ADMIN' | 'CANDIDATE' =
      role === UserRole.ADMIN
        ? 'ADMIN'
        : role === UserRole.EMPLOYER
          ? 'EMPLOYER'
          : 'CANDIDATE';
    if (actor === 'EMPLOYER' && application.job.company.ownerId !== actorId) {
      throw new ForbiddenException('Not your applicant');
    }
    if (actor === 'CANDIDATE' && application.candidateId !== actorId) {
      throw new ForbiddenException('Not your application');
    }
    assertLegalTransition(application.status, dto.toStatus, actor === 'ADMIN' ? 'EMPLOYER' : actor);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.application.update({
        where: { id: application.id },
        data: {
          status: dto.toStatus,
          withdrawnAt: dto.toStatus === ApplicationStatus.WITHDRAWN ? new Date() : application.withdrawnAt,
        },
      });
      await tx.applicationEvent.create({
        data: {
          applicationId: application.id,
          fromStatus: application.status,
          toStatus: dto.toStatus,
          actorId,
          note: dto.note,
          isPublic: dto.isPublic ?? false,
        },
      });
      return next;
    });

    await this.notifications.push(application.candidateId, {
      type: NotificationType.APPLICATION_UPDATE,
      title: `${application.job.title} is now ${dto.toStatus}`,
      body: dto.note || `Your application moved to ${dto.toStatus}.`,
      href: '/applications',
    });
    await this.mail.send(
      application.candidate.email,
      `Application update: ${application.job.title}`,
      `<p>Your application for <strong>${application.job.title}</strong> is now <strong>${dto.toStatus}</strong>.</p>${
        dto.isPublic && dto.note ? `<p>${dto.note}</p>` : ''
      }`,
    );
    return updated;
  }

  async dashboard(ownerId: string) {
    const company = await this.prisma.company.findUnique({ where: { ownerId } });
    if (!company) {
      return { openJobs: 0, newApplicantsThisWeek: 0, pipeline: {} };
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [openJobs, newApplicantsThisWeek, grouped] = await Promise.all([
      this.prisma.job.count({
        where: { companyId: company.id, status: 'PUBLISHED', deletedAt: null },
      }),
      this.prisma.application.count({
        where: { job: { companyId: company.id }, createdAt: { gte: weekAgo }, deletedAt: null },
      }),
      this.prisma.application.groupBy({
        by: ['status'],
        where: { job: { companyId: company.id }, deletedAt: null },
        _count: true,
      }),
    ]);
    const pipeline = Object.fromEntries(grouped.map((row) => [row.status, row._count]));
    return { openJobs, newApplicantsThisWeek, pipeline, hired: pipeline.HIRED ?? 0 };
  }
}
