import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "./auth-user.interface";

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException("Authentication is required.");
    }
    if (!request.user.emailVerified) {
      throw new ForbiddenException("Please verify your email before continuing.");
    }
    return true;
  }
}
