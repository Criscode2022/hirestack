import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConnectionStatus, NotificationType } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { isDirectoryProfile, mixDirectoryPeople } from './directory-people';
import { fetchDirectoryPeople } from './directory-upstream';
import { profileCompleteness } from './profile-completeness';
import { shouldUseUpstream, upstreamApiUrl } from '../common/upstream';

@Injectable()
export class NetworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async searchPeople(q?: string) {
    if (shouldUseUpstream()) {
      return fetchDirectoryPeople(fetch, upstreamApiUrl(), q);
    }
    const select = {
      id: true,
      name: true,
      headline: true,
      location: true,
      openToWork: true,
      role: true,
      company: { select: { id: true, name: true, slug: true } },
      userSkills: { include: { skill: { select: { slug: true, name: true } } } },
    } as const;
    const whereBase = {
      deletedAt: null,
      status: 'ACTIVE' as const,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { headline: { contains: q, mode: 'insensitive' as const } },
              { location: { contains: q, mode: 'insensitive' as const } },
              { userSkills: { some: { skill: { name: { contains: q, mode: 'insensitive' as const } } } } },
            ],
          }
        : {}),
    };
    const toCard = (row: {
      id: string;
      name: string;
      headline: string | null;
      location: string | null;
      openToWork: boolean;
      role: string;
      company: { id: string; name: string; slug: string } | null;
      userSkills: Array<{ skill: { slug: string; name: string } }>;
    }) => ({
      id: row.id,
      name: row.name,
      headline: row.headline,
      location: row.location,
      openToWork: row.openToWork,
      role: row.role,
      company: row.company,
      skills: row.userSkills.map((item) => item.skill),
    });
    if (q?.trim()) {
      const rows = await this.prisma.user.findMany({
        where: whereBase,
        take: 80,
        orderBy: [{ openToWork: 'desc' }, { createdAt: 'desc' }],
        select,
      });
      return rows.map(toCard).filter(isDirectoryProfile).slice(0, 48);
    }
    const [leads, candidates] = await Promise.all([
      this.prisma.user.findMany({
        where: { ...whereBase, role: { in: ['EMPLOYER', 'ADMIN'] } },
        take: 16,
        orderBy: { createdAt: 'desc' },
        select,
      }),
      this.prisma.user.findMany({
        where: { ...whereBase, role: 'CANDIDATE' },
        take: 64,
        orderBy: [{ openToWork: 'desc' }, { createdAt: 'desc' }],
        select,
      }),
    ]);
    return mixDirectoryPeople(
      leads.map(toCard).filter(isDirectoryProfile),
      candidates.map(toCard).filter(isDirectoryProfile),
    );
  }

  async getPublicProfile(viewerId: string | undefined, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        userSkills: { include: { skill: { select: { slug: true, name: true } } } },
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startYear: 'desc' } },
        projects: { orderBy: { createdAt: 'desc' } },
        receivedRecommendations: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, headline: true } } },
        },
        _count: { select: { resumes: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('Profile not found');
    }
    let connectionStatus: 'NONE' | 'PENDING_OUT' | 'PENDING_IN' | 'CONNECTED' | 'SELF' = 'NONE';
    let connectionId: string | null = null;
    if (viewerId === user.id) {
      connectionStatus = 'SELF';
    } else if (viewerId) {
      const link = await this.prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: viewerId, addresseeId: user.id },
            { requesterId: user.id, addresseeId: viewerId },
          ],
        },
      });
      connectionId = link?.id ?? null;
      if (link?.status === 'ACCEPTED') connectionStatus = 'CONNECTED';
      else if (link?.status === 'PENDING' && link.requesterId === viewerId) connectionStatus = 'PENDING_OUT';
      else if (link?.status === 'PENDING') connectionStatus = 'PENDING_IN';
    }
    return {
      id: user.id,
      name: user.name,
      headline: user.headline,
      location: user.location,
      bio: user.bio,
      portfolioUrl: user.portfolioUrl,
      openToWork: user.openToWork,
      role: user.role,
      company: user.company,
      skills: user.userSkills.map((item) => item.skill),
      experiences: user.experiences,
      education: user.education,
      projects: user.projects,
      recommendations: user.receivedRecommendations.map((row) => ({
        id: row.id,
        relationship: row.relationship,
        body: row.body,
        createdAt: row.createdAt,
        author: row.author,
      })),
      connectionStatus,
      connectionId,
      connectionCount: await this.prisma.connection.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: user.id }, { addresseeId: user.id }],
        },
      }),
      completeness: profileCompleteness(user),
    };
  }

  async recommend(authorId: string, subjectId: string, input: { relationship: string; body: string }) {
    if (authorId === subjectId) {
      throw new BadRequestException('You cannot recommend yourself');
    }
    const created = await this.prisma.recommendation.create({
      data: {
        authorId,
        subjectId,
        relationship: input.relationship,
        body: input.body,
      },
    });
    const author = await this.prisma.user.findUniqueOrThrow({ where: { id: authorId } });
    await this.notifications.push(subjectId, {
      type: NotificationType.RECOMMENDATION,
      title: `${author.name} wrote you a recommendation`,
      body: input.body.slice(0, 140),
      href: `/people/${subjectId}`,
    });
    return created;
  }

  async requestConnection(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot connect with yourself');
    }
    const existing = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });
    if (existing?.status === 'ACCEPTED') {
      return existing;
    }
    if (existing?.status === 'PENDING' && existing.requesterId === addresseeId) {
      return this.respond(requesterId, existing.id, 'ACCEPTED');
    }
    const created = existing
      ? await this.prisma.connection.update({
          where: { id: existing.id },
          data: { requesterId, addresseeId, status: 'PENDING' },
        })
      : await this.prisma.connection.create({
          data: { requesterId, addresseeId, status: 'PENDING' },
        });
    const requester = await this.prisma.user.findUniqueOrThrow({ where: { id: requesterId } });
    await this.notifications.push(addresseeId, {
      type: NotificationType.CONNECTION_REQUEST,
      title: `${requester.name} wants to connect`,
      body: requester.headline ?? 'New connection request',
      href: `/people/${requesterId}`,
    });
    return created;
  }

  async respond(userId: string, connectionId: string, status: 'ACCEPTED' | 'DECLINED') {
    const connection = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection || connection.addresseeId !== userId) {
      throw new NotFoundException('Connection request not found');
    }
    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: { status },
    });
    if (status === 'ACCEPTED') {
      const addressee = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      await this.notifications.push(connection.requesterId, {
        type: NotificationType.CONNECTION_ACCEPTED,
        title: `${addressee.name} accepted your request`,
        body: 'You are now connected on HireStack.',
        href: `/people/${userId}`,
      });
    }
    return updated;
  }

  async mine(userId: string) {
    const rows = await this.prisma.connection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, headline: true, location: true, openToWork: true } },
        addressee: { select: { id: true, name: true, headline: true, location: true, openToWork: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      other: row.requesterId === userId ? row.addressee : row.requester,
    }));
  }

  pending(userId: string) {
    return this.prisma.connection.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: {
        requester: { select: { id: true, name: true, headline: true, location: true, openToWork: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async suggested(userId: string) {
    const links = await this.prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      select: { requesterId: true, addresseeId: true },
    });
    const exclude = new Set<string>([userId]);
    for (const link of links) {
      exclude.add(link.requesterId);
      exclude.add(link.addresseeId);
    }
    const mySkills = await this.prisma.userSkill.findMany({ where: { userId }, select: { skillId: true } });
    const skillIds = mySkills.map((row) => row.skillId);
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        id: { notIn: [...exclude] },
        ...(skillIds.length ? { userSkills: { some: { skillId: { in: skillIds } } } } : {}),
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
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
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      headline: row.headline,
      location: row.location,
      openToWork: row.openToWork,
      role: row.role,
      company: row.company,
      skills: row.userSkills.map((item) => item.skill),
    }));
  }

  followCompany(userId: string, companyId: string) {
    return this.prisma.companyFollow.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: { userId, companyId },
      update: {},
    });
  }

  unfollowCompany(userId: string, companyId: string) {
    return this.prisma.companyFollow.deleteMany({ where: { userId, companyId } }).then(() => ({ ok: true }));
  }

  async following(userId: string) {
    const rows = await this.prisma.companyFollow.findMany({
      where: { userId },
      include: { company: { select: { id: true, name: true, slug: true, logoUrl: true, industry: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => row.company);
  }

  isFollowing(userId: string, companyId: string) {
    return this.prisma.companyFollow
      .findUnique({ where: { userId_companyId: { userId, companyId } } })
      .then((row) => ({ following: Boolean(row) }));
  }
}
