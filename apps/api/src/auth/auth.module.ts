import { Module } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { FirebaseAuthGuard } from "./firebase-auth.guard";
import { FirebaseAuthService } from "./firebase-auth.service";
import { VerifiedEmailGuard } from "./verified-email.guard";

@Module({
  providers: [AdminGuard, FirebaseAuthService, FirebaseAuthGuard, VerifiedEmailGuard],
  exports: [AdminGuard, FirebaseAuthService, FirebaseAuthGuard, VerifiedEmailGuard],
})
export class AuthModule {}
