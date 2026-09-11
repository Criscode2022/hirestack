import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import {
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_DAYS,
  UserRole,
} from '@hirestack/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { jwtAccessSecret } from './jwt-secret';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with that email already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await this.passwords.hash(dto.password),
        name: dto.name,
        role: dto.role,
      },
    });
    return this.issueSession(user.id, user.email, user.role, res);
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user || !(await this.passwords.verify(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }
    return this.issueSession(user.id, user.email, user.role, res);
  }

  async refresh(rawToken: string | undefined, res: Response) {
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt || stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(
      stored.user.id,
      stored.user.email,
      stored.user.role,
      res,
      stored.familyId,
    );
  }

  async logout(rawToken: string | undefined, res: Response) {
    if (rawToken) {
      const stored = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: this.hashToken(rawToken) },
      });
      if (stored) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }
    this.clearRefreshCookie(res);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
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
        company: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (user) {
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const raw = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(raw),
          expiresAt,
        },
      });
      const origin = this.config.get('WEB_ORIGIN') ?? 'http://localhost:4200';
      const href = `${origin.split(',')[0]}/reset?token=${raw}`;
      await this.mail.send(
        user.email,
        'Reset your HireStack password',
        `<p>Reset your password with this link (valid for one hour):</p><p><a href="${href}">${href}</a></p>`,
      );
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset link is invalid or expired');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: await this.passwords.hash(password) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user || !(await this.passwords.verify(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.passwords.hash(nextPassword) },
    });
    return { ok: true };
  }

  private async issueSession(
    userId: string,
    email: string,
    role: UserRole,
    res: Response,
    familyId = randomBytes(16).toString('hex'),
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      {
        secret: jwtAccessSecret(this.config.get<string>('JWT_ACCESS_SECRET') ?? this.config.get<string>('JWT_SECRET')),
        expiresIn: '15m',
      },
    );
    const rawRefresh = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    await this.prisma.refreshToken.create({
      data: {
        familyId,
        tokenHash: this.hashToken(rawRefresh),
        userId,
        expiresAt,
      },
    });
    this.setRefreshCookie(res, rawRefresh, expiresAt);
    return { accessToken, user: await this.me(userId) };
  }

  private setRefreshCookie(res: Response, token: string, expires: Date) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      expires,
      path: '/api/auth',
      domain: this.config.get('COOKIE_DOMAIN') || undefined,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      path: '/api/auth',
      domain: this.config.get('COOKIE_DOMAIN') || undefined,
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
