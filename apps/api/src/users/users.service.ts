import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetSkillsDto } from './dto/set-skills.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getMe(userId: string) {
    return this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        headline: true,
        location: true,
        bio: true,
        portfolioUrl: true,
        desiredSalaryMin: true,
        desiredSalaryMax: true,
        workAuthorization: true,
        status: true,
        userSkills: { include: { skill: true } },
        company: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.getMe(userId);
  }

  async setSkills(userId: string, dto: SetSkillsDto) {
    const skills = await this.prisma.skill.findMany({
      where: { slug: { in: dto.skillSlugs } },
    });
    await this.prisma.$transaction([
      this.prisma.userSkill.deleteMany({ where: { userId } }),
      this.prisma.userSkill.createMany({
        data: skills.map((skill) => ({ userId, skillId: skill.id })),
      }),
    ]);
    return this.getMe(userId);
  }

  async listResumes(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createResume(
    userId: string,
    file: { url: string; fileName: string; mimeType: string; sizeBytes: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.resume.updateMany({ where: { userId, isCurrent: true }, data: { isCurrent: false } });
      return tx.resume.create({
        data: {
          userId,
          fileUrl: file.url,
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          isCurrent: true,
        },
      });
    });
  }

  async deleteResume(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    await this.prisma.resume.delete({ where: { id: resumeId } });
    if (resume.isCurrent) {
      const next = await this.prisma.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.resume.update({ where: { id: next.id }, data: { isCurrent: true } });
      }
    }
    return { ok: true };
  }
}
