import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Object.values(config).every(Boolean);
export const firebaseApp = firebaseEnabled ? (getApps().length ? getApp() : initializeApp(config)) : null;
export const googleProvider = firebaseApp ? new GoogleAuthProvider() : null;
if (googleProvider) googleProvider.setCustomParameters({ prompt: "select_account" });

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;

// Set persistence before consumers subscribe to Auth. Firebase uses local
// persistence by default, but exposing this promise lets the provider wait for
// the explicit configuration without leaving an unhandled rejection behind.
export const firebasePersistenceReady = auth && typeof window !== "undefined"
  ? setPersistence(auth, browserLocalPersistence).catch((reason) => {
    console.error("[auth] Unable to configure local session persistence.", reason);
  })
  : Promise.resolve();
