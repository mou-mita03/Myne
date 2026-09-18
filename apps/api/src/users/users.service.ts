import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import type { AuthUser } from "../auth/auth-user.interface";
import { PrismaService } from "../prisma/prisma.service";
import type { SyncUserDto } from "./dto/sync-user.dto";

export type UserProfileResponse = Pick<
  User,
  "id" | "firebaseUid" | "email" | "name" | "role" | "createdAt" | "updatedAt"
> & {
  accountStatus: "active" | "disabled";
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFirebaseUid(firebaseUid: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException("The authenticated user profile does not exist.");
    }
    if (user.accountStatus !== "ACTIVE") {
      throw new ForbiddenException("This account has been disabled.");
    }
    return {
      ...user,
      accountStatus: user.accountStatus === "ACTIVE" ? "active" : "disabled",
    };
  }

  async syncUser(authUser: AuthUser, input: SyncUserDto): Promise<User> {
    if (!authUser.email) {
      throw new BadRequestException("The Firebase account must have an email address.");
    }

    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email: authUser.email },
      select: { firebaseUid: true, accountStatus: true },
    });
    if (existingEmailUser && existingEmailUser.firebaseUid !== authUser.uid) {
      throw new ConflictException("This email is already linked to another account.");
    }
    if (existingEmailUser?.accountStatus !== undefined && existingEmailUser.accountStatus !== "ACTIVE") {
      throw new ForbiddenException("This account has been disabled.");
    }

    const name = input.name?.trim() || authUser.name || undefined;
    try {
      console.info("[users/sync] Before Prisma upsert", {
        uid: authUser.uid,
        email: authUser.email,
        name,
      });
      const syncedUser = await this.prisma.user.upsert({
        where: { firebaseUid: authUser.uid },
        create: {
          firebaseUid: authUser.uid,
          email: authUser.email,
          name,
        },
        update: {
          email: authUser.email,
          ...(name ? { name } : {}),
        },
      });
      console.info("[users/sync] Prisma upsert succeeded", {
        id: syncedUser.id,
        uid: syncedUser.firebaseUid,
        email: syncedUser.email,
        name: syncedUser.name,
      });
      return syncedUser;
    } catch (reason) {
      if (reason instanceof Prisma.PrismaClientKnownRequestError && reason.code === "P2002") {
        throw new ConflictException("This account is already linked to another user.");
      }
      throw reason;
    }
  }
}
