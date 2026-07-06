import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { User } from '@repo/db';
import { SessionService } from '../session.service';
import { IS_PUBLIC_KEY } from '../decorators';

const SESSION_COOKIE_NAME = 'bootcamp_starter_session';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
  activeOrganizationId?: string | null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = this.extractSessionId(request);

    if (!sessionId) {
      throw new UnauthorizedException('No session found');
    }

    const session = await this.sessionService.validateSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach user, session ID, and active org to the request for later use
    const authRequest = request as AuthenticatedRequest;
    authRequest.user = session.user;
    authRequest.sessionId = sessionId;
    authRequest.activeOrganizationId = session.activeOrganizationId;

    return true;
  }

  private extractSessionId(request: Request): string | undefined {
    // Try to get from cookie first
    const cookieSession = request.cookies?.[SESSION_COOKIE_NAME] as
      | string
      | undefined;
    if (cookieSession) {
      return cookieSession;
    }

    return undefined;
  }
}

export { SESSION_COOKIE_NAME };
