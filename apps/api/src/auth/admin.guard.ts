import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./auth-user.interface";
import { ROLES_KEY } from "./roles.decorator";

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authUser = request.user;
    if (!authUser) throw new UnauthorizedException("Authentication is required.");

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [Role.ADMIN];

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: authUser.uid },
      select: { role: true, accountStatus: true },
    });

    if (
      !user ||
      user.accountStatus !== "ACTIVE" ||
      !requiredRoles.includes(user.role)
    ) {
      throw new ForbiddenException("You don't have permission to access this page.");
    }

    return true;
  }
}
