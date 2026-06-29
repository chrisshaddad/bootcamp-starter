import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthenticatedUser | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  },
);
