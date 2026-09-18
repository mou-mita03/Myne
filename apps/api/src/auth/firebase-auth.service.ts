import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import {
  getAuth,
  type Auth,
  type DecodedIdToken,
} from "firebase-admin/auth";
import type { AuthUser } from "./auth-user.interface";

@Injectable()
export class FirebaseAuthService {
  private readonly auth: Auth;

  constructor(configService: ConfigService) {
    const app = this.getFirebaseApp(configService);
    this.auth = getAuth(app);
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const decodedToken = await this.auth.verifyIdToken(token, true);
    return this.toAuthUser(decodedToken);
  }

  private getFirebaseApp(configService: ConfigService): App {
    const projectId = configService.getOrThrow<string>("FIREBASE_PROJECT_ID");
    const clientEmail = configService.getOrThrow<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = configService
      .getOrThrow<string>("FIREBASE_PRIVATE_KEY")
      .replace(/\\n/g, "\n");

    const existingApp = getApps()[0];
    return existingApp ?? initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  private toAuthUser(decodedToken: DecodedIdToken): AuthUser {
    return {
      uid: decodedToken.uid,
      ...(decodedToken.email ? { email: decodedToken.email } : {}),
      ...(decodedToken.name ? { name: decodedToken.name } : {}),
      emailVerified: decodedToken.email_verified === true,
      ...(decodedToken.firebase.sign_in_provider
        ? { signInProvider: decodedToken.firebase.sign_in_provider }
        : {}),
    };
  }
}
