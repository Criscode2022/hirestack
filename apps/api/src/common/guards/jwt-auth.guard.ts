import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { resolveUpstreamUser, shouldUseUpstream } from '../upstream';
import type { RequestUser } from '../types/request-user';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      user?: RequestUser;
    }>();
    if (isPublic && !request.headers?.authorization) {
      return true;
    }
    if (shouldUseUpstream()) {
      return this.activateFromUpstream(request, Boolean(isPublic));
    }
    return super.canActivate(context);
  }

  private async activateFromUpstream(
    request: { headers?: { authorization?: string }; user?: RequestUser },
    isPublic: boolean,
  ) {
    const user = await resolveUpstreamUser(request.headers?.authorization);
    if (user) {
      request.user = user;
    }
    if (isPublic) {
      return true;
    }
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }

  override handleRequest<TUser>(err: Error | null, user: TUser, _info: unknown, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return user ?? (null as TUser);
    }
    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
