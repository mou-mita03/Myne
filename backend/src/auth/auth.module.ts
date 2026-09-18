import { Module } from '@nestjs/common';
import { FirebaseGuard } from './firebase.guard';
import { FirebaseService } from './firebase.service';

@Module({
  providers: [FirebaseService, FirebaseGuard],
  exports: [FirebaseService, FirebaseGuard],
})
export class AuthModule {}
