import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import type { AuthUser } from "../auth/auth-user.interface";
import type { Request } from "express";
import { Req } from "@nestjs/common";
import { SyncUserDto } from "./dto/sync-user.dto";
import { UsersService } from "./users.service";

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("sync")
  @UseGuards(FirebaseAuthGuard)
  syncUser(@Req() request: AuthenticatedRequest, @Body() input: SyncUserDto) {
    console.info("[users/sync] Request received", {
      uid: request.user.uid,
      email: request.user.email,
      name: input.name,
    });
    return this.usersService.syncUser(request.user, input);
  }

  @Get("me")
  @UseGuards(FirebaseAuthGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return this.usersService.findByFirebaseUid(request.user.uid);
  }
}
