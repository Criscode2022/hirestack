import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { jwtAccessSecret } from './jwt-secret';
import type { RequestUser } from '../common/types/request-user';
import type { UserRole } from '@hirestack/shared';

interface AccessPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtAccessSecret(config.get<string>('JWT_ACCESS_SECRET') ?? config.get<string>('JWT_SECRET')),
    });
  }

  async validate(payload: AccessPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is not available');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
