export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  emailVerified: boolean;
  signInProvider?: string;
}
