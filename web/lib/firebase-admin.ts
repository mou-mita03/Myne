import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function readAdminConfig() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { clientEmail, privateKey, projectId };
}

let adminApp: App | null | undefined;

export function getFirebaseAdminApp() {
  if (adminApp !== undefined) return adminApp;

  const config = readAdminConfig();
  if (!config) {
    adminApp = null;
    return adminApp;
  }

  adminApp = getApps()[0] || initializeApp({
    credential: cert(config),
    projectId: config.projectId,
  });
  return adminApp;
}

export function getFirebaseAdminAuth() {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return getAuth(app);
}
