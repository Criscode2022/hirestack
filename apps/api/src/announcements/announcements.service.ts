import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, type Workplace } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const WORKPLACES = new Set(['REMOTE', 'HYBRID', 'ONSITE']);

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(viewerId?: string) {
    const rows = await this.prisma.announcement.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            headline: true,
            company: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: { select: { applications: true } },
        applications: viewerId
          ? { where: { userId: viewerId }, select: { id: true } }
          : false,
      },
    });
    return rows.map((row) => this.serialize(row, viewerId));
  }

  async create(
    authorId: string,
    input: { title: string; body: string; location?: string; workplace?: Workplace },
  ) {
    const title = input.title?.trim() ?? '';
    const body = input.body?.trim() ?? '';
    if (title.length < 4 || title.length > 80) {
      throw new BadRequestException('Title must be 4–80 characters');
    }
    if (body.length < 8 || body.length > 400) {
      throw new BadRequestException('Announcement must be 8–400 characters');
    }
    if (input.workplace && !WORKPLACES.has(input.workplace)) {
      throw new BadRequestException('Invalid workplace');
    }
    const created = await this.prisma.announcement.create({
      data: {
        authorId,
        title,
        body,
        location: input.location?.trim() || null,
        workplace: input.workplace ?? null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            headline: true,
            company: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: { select: { applications: true } },
      },
    });
    return this.serialize(created, authorId);
  }

  async apply(userId: string, announcementId: string, note?: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { author: true },
    });
    if (!announcement || announcement.status !== 'OPEN') {
      throw new NotFoundException('Announcement is not open');
    }
    if (announcement.authorId === userId) {
      throw new BadRequestException('You cannot apply to your own announcement');
    }
    const resume = await this.prisma.resume.findFirst({
      where: { userId, isCurrent: true },
    });
    if (!resume) {
      throw new BadRequestException('Add a current resume on your profile first');
    }
    try {
      await this.prisma.announcementApplication.create({
        data: {
          announcementId,
          userId,
          note: note?.trim() || null,
        },
      });
    } catch {
      throw new ConflictException('You already applied to this announcement');
    }
    const candidate = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.notifications.push(announcement.authorId, {
      type: NotificationType.APPLICATION_UPDATE,
      title: `${candidate.name} applied to ${announcement.title}`,
      body: 'New applicant on your live announcement.',
      href: '/live',
    });
    return this.list(userId).then((rows) => rows.find((row) => row.id === announcementId));
  }

  async close(userId: string, announcementId: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    if (announcement.authorId !== userId) {
      throw new ForbiddenException('Only the announcer can close this');
    }
    await this.prisma.announcement.update({
      where: { id: announcementId },
      data: { status: 'CLOSED' },
    });
    return { ok: true };
  }

  private serialize(
    row: {
      id: string;
      title: string;
      body: string;
      location: string | null;
      workplace: string | null;
      status: string;
      createdAt: Date;
      author: {
        id: string;
        name: string;
        headline: string | null;
        company: { id: string; name: string; slug: string } | null;
      };
      _count: { applications: number };
      applications?: Array<{ id: string }>;
    },
    viewerId?: string,
  ) {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      location: row.location,
      workplace: row.workplace,
      status: row.status,
      createdAt: row.createdAt,
      applicantCount: row._count.applications,
      appliedByMe: Boolean(viewerId && row.applications?.length),
      author: row.author,
    };
  }
}
