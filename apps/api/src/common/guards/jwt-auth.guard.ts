import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@/common/decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (user) {
      return user;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ method?: string; url?: string }>();
    const infoMessage =
      typeof info === 'object' && info !== null && 'message' in info
        ? String(info.message)
        : typeof info === 'string'
          ? info
          : undefined;
    const infoName =
      typeof info === 'object' && info !== null && 'name' in info
        ? String(info.name)
        : undefined;
    const errMessage = err instanceof Error ? err.message : undefined;
    const detail = infoMessage ?? errMessage ?? 'Unauthorized';
    const label = infoName ?? (err instanceof Error ? err.name : 'AuthError');

    this.logger.warn(
      `${request.method ?? 'UNKNOWN'} ${request.url ?? ''} rejected: ${label} - ${detail}`,
    );

    if (process.env.NODE_ENV !== 'production') {
      throw new UnauthorizedException(`${label}: ${detail}`);
    }

    throw err instanceof UnauthorizedException
      ? err
      : new UnauthorizedException('Unauthorized');
  }
}
