import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService {
  private readonly app: App;
  private readonly auth: Auth;

  constructor(config: ConfigService) {
    this.app = getApps()[0] ?? initializeApp({
      credential: cert({
        projectId: config.getOrThrow<string>('firebase.projectId'),
        clientEmail: config.getOrThrow<string>('firebase.clientEmail'),
        privateKey: config.getOrThrow<string>('firebase.privateKey'),
      }),
    });
    this.auth = getAuth(this.app);
  }

  verifyIdToken(token: string): Promise<DecodedIdToken> {
    return this.auth.verifyIdToken(token);
  }
}
