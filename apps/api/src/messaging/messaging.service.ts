import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

function pair(a: string, b: string) {
  return a < b ? { participantAId: a, participantBId: b } : { participantAId: b, participantBId: a };
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  unreadCount(userId: string) {
    return this.prisma.message.count({
      where: {
        senderId: { not: userId },
        readAt: null,
        conversation: { OR: [{ participantAId: userId }, { participantBId: userId }] },
      },
    });
  }

  async start(userId: string, otherUserId: string, jobId?: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException('Cannot message yourself');
    }
    const ids = pair(userId, otherUserId);
    const conversation = await this.prisma.conversation.upsert({
      where: { participantAId_participantBId: ids },
      create: { ...ids, jobId },
      update: jobId ? { jobId } : {},
    });
    return this.detail(userId, conversation.id);
  }

  async inbox(userId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
      include: {
        participantA: { select: { id: true, name: true, headline: true } },
        participantB: { select: { id: true, name: true, headline: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    return Promise.all(
      rows.map(async (row) => {
        const other = row.participantAId === userId ? row.participantB : row.participantA;
        const unreadCount = await this.prisma.message.count({
          where: { conversationId: row.id, senderId: { not: userId }, readAt: null },
        });
        const last = row.messages[0];
        return {
          id: row.id,
          other,
          lastMessage: last
            ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId }
            : null,
          unreadCount,
          lastMessageAt: row.lastMessageAt,
        };
      }),
    );
  }

  async detail(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participantA: { select: { id: true, name: true, headline: true } },
        participantB: { select: { id: true, name: true, headline: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 100 },
      },
    });
    if (!conversation || (conversation.participantAId !== userId && conversation.participantBId !== userId)) {
      throw new NotFoundException('Conversation not found');
    }
    await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
    const other =
      conversation.participantAId === userId ? conversation.participantB : conversation.participantA;
    return { ...conversation, other };
  }

  async send(userId: string, conversationId: string, body: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || (conversation.participantAId !== userId && conversation.participantBId !== userId)) {
      throw new NotFoundException('Conversation not found');
    }
    const message = await this.prisma.message.create({
      data: { conversationId, senderId: userId, body },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    const otherId = conversation.participantAId === userId ? conversation.participantBId : conversation.participantAId;
    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.notifications.push(otherId, {
      type: NotificationType.MESSAGE,
      title: `New message from ${sender.name}`,
      body: body.slice(0, 140),
      href: `/messages/${conversationId}`,
    });
    return message;
  }
}
