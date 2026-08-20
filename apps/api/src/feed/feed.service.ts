import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, PostKind } from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(viewerId?: string) {
    const posts = await this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        author: { select: { id: true, name: true, headline: true } },
        company: { select: { id: true, name: true, slug: true } },
        likes: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 8,
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });
    return posts.map((post) => ({
      id: post.id,
      kind: post.kind,
      body: post.body,
      createdAt: post.createdAt,
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      likedByMe: viewerId ? post.likes.some((like) => like.userId === viewerId) : false,
      author: post.author,
      company: post.company,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        author: comment.author,
      })),
    }));
  }

  async create(userId: string, input: { body: string; kind?: PostKind; jobId?: string }) {
    const company = await this.prisma.company.findUnique({ where: { ownerId: userId } });
    return this.prisma.post.create({
      data: {
        authorId: userId,
        companyId: company?.id,
        body: input.body,
        kind: input.kind ?? (company ? 'HIRING' : 'UPDATE'),
        jobId: input.jobId,
      },
    });
  }

  async like(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.postLike.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    });
    return { ok: true };
  }

  async unlike(userId: string, postId: string) {
    await this.prisma.postLike.deleteMany({ where: { userId, postId } });
    return { ok: true };
  }

  async comment(userId: string, postId: string, body: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const created = await this.prisma.postComment.create({
      data: { postId, authorId: userId, body },
      include: { author: { select: { id: true, name: true } } },
    });
    if (post.authorId !== userId) {
      const author = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      await this.notifications.push(post.authorId, {
        type: NotificationType.COMMENT,
        title: `${author.name} commented on your post`,
        body: body.slice(0, 140),
        href: '/feed',
      });
    }
    return created;
  }
}
