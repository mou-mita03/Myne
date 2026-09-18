import { Controller, Get, UseGuards } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminGuard } from "../auth/admin.guard";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { VerifiedEmailGuard } from "../auth/verified-email.guard";
import { Role } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";

@Controller("admin")
@UseGuards(FirebaseAuthGuard, VerifiedEmailGuard, AdminGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("access")
  getAccess() {
    return { role: Role.ADMIN };
  }

  @Get("summary")
  async getSummary() {
    const users = await this.prisma.user.count();
    return { users };
  }
}
