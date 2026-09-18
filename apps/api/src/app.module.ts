import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { CommonModule } from "./common/common.module";
import { environmentValidationSchema } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: environmentValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    UsersModule,
    CommonModule,
  ],
})
export class AppModule {}
