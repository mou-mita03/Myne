import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { FirebaseAuthService } from "./firebase-auth.service";
import type { AuthUser } from "./auth-user.interface";

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAuthService: FirebaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header("authorization");
    const token = this.extractBearerToken(authorization);

    if (!token) {
      throw new UnauthorizedException("A Firebase ID token is required.");
    }

    try {
      request.user = await this.firebaseAuthService.verifyToken(token);
      return true;
    } catch (reason) {
      const code =
        typeof reason === "object" && reason !== null && "code" in reason
          ? String(reason.code)
          : "";
      if (code === "auth/id-token-expired") {
        throw new UnauthorizedException("Your session expired. Please login again.");
      }
      if (code === "auth/id-token-revoked") {
        throw new UnauthorizedException("Your session is no longer valid. Please login again.");
      }
      throw new UnauthorizedException("Your session is invalid. Please login again.");
    }
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization) return undefined;
    const [scheme, token] = authorization.trim().split(/\s+/);
    return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
  }
}
