"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  EmailAuthProvider,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";

import {
  auth,
  db,
  firebaseEnabled,
  firebasePersistenceReady,
  googleProvider,
} from "@/lib/firebase";

import {
  syncUserProfile,
  updateProfileFields,
  fallbackProfile,
  type AccountPreferences,
  type UserProfile,
} from "@/services/user/profile-service";


export type { UserProfile };

export type UserRole = "user" | "admin";


type AuthContextValue = {
  changePassword: (
    currentPassword: string,
    nextPassword: string
  ) => Promise<void>;

  createAccount: (
    email: string,
    password: string,
    confirmation: string,
    name: string
  ) => Promise<void>;

  enabled: boolean;
  authError: string;
  error: string;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  loginWithGoogle: () => Promise<void>;

  logout: () => Promise<void>;

  profile: UserProfile | null;

  requiresEmailVerification: boolean;

  resendVerificationEmail: () => Promise<void>;

  refreshVerificationStatus: () => Promise<boolean>;

  refreshProfile: () => Promise<void>;

  syncCurrentUser: () => Promise<void>;

  logoutAllSessions: () => Promise<void>;

  requestPasswordReset: (email: string) => Promise<void>;

  resetPassword: (code: string, nextPassword: string, confirmation: string) => Promise<void>;

  updateUserProfile: (input: {
    displayName: string;
    photoURL?: string;
    preferences?: AccountPreferences;
  }) => Promise<void>;

  setWishlistBook: (
    bookId: number,
    wished: boolean
  ) => Promise<void>;

  user: User | null;

  userProfile: UserProfile | null;

  role: UserRole;

  isAdmin: boolean;
};


const AuthContext =
  createContext<AuthContextValue | null>(null);


const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const authMessages: Record<string, string> = {
  "auth/email-already-in-use":
    "An account already exists for this email address.",

  "auth/invalid-credential":
    "Incorrect email or password.",

  "auth/invalid-login-credentials":
    "Incorrect email or password.",

  "auth/user-not-found":
    "Incorrect email or password.",

  "auth/wrong-password":
    "Incorrect email or password.",

  "auth/user-disabled":
    "This account has been disabled.",

  "auth/network-request-failed":
    "Network error. Check your connection.",

  "auth/too-many-requests":
    "Too many attempts. Please wait and try again.",

  "auth/weak-password":
    "Use a stronger password.",

  "auth/requires-recent-login":
    "Please sign in again before changing password.",

  "auth/popup-closed-by-user":
    "Google sign-in popup was closed.",

  "auth/popup-blocked":
    "Allow popups and try again.",

  "auth/id-token-expired":
    "Your session expired. Please login again.",

  "auth/user-token-expired":
    "Your session expired. Please login again.",

  "auth/invalid-user-token":
    "Your session is invalid. Please login again.",

  "auth/expired-action-code":
    "This password reset link has expired. Request a new one.",

  "auth/invalid-action-code":
    "This password reset link is invalid. Request a new one.",
};


function authMessage(reason: unknown) {
  const code =
    typeof reason === "object" &&
    reason !== null &&
    "code" in reason
      ? String(reason.code)
      : "";

  return (
    authMessages[code] ||
    (reason instanceof Error
      ? reason.message.replace(/^Firebase:\s*/, "")
      : "Something went wrong.")
  );
}


function validatePassword(password: string) {
  if (
    password.length < 10 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      "Use at least 10 characters with uppercase, lowercase, and a number."
    );
  }
}


function unverified(user: User | null) {
  return Boolean(
    user &&
      !user.emailVerified &&
      user.providerData.some(
        (provider) =>
          provider.providerId === "password"
      )
  );
}

type BackendUserProfile = {
  accountStatus: "active" | "disabled";
  createdAt: string;
  email: string;
  firebaseUid: string;
  id: string;
  name: string | null;
  role: "ADMIN" | "USER";
  updatedAt: string;
};

async function fetchBackend(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new Error(
        "Unable to reach the backend. Check that the API is running and that your network or CORS settings allow this frontend.",
      );
    }
    throw reason;
  }
}

async function backendResponseError(
  response: Response,
  operation: string,
): Promise<Error> {
  let message = "";
  try {
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object") {
      const candidate = payload as { error?: unknown; message?: unknown };
      if (typeof candidate.error === "string") message = candidate.error;
      else if (typeof candidate.message === "string") message = candidate.message;
    }
  } catch {
    // Use the HTTP status when the backend does not return JSON.
  }

  if (response.status === 401) {
    if (message.toLowerCase().includes("expired")) {
      return new Error("Your session expired. Please sign in again.");
    }
    return new Error("Your session is invalid. Please sign in again.");
  }
  if (response.status === 403) return new Error("This account has been disabled.");
  return new Error(`${operation} (HTTP ${response.status})${message ? `: ${message}` : "."}`);
}

async function syncBackendProfile(user: User): Promise<BackendUserProfile> {
  const token = await user.getIdToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const syncResponse = await fetchBackend(`${apiUrl}/users/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: user.displayName || user.email || "" }),
  });
  if (!syncResponse.ok) {
    throw await backendResponseError(syncResponse, "Account synchronization failed");
  }

  const response = await fetchBackend(`${apiUrl}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw await backendResponseError(response, "Account profile could not be loaded");
  }
  const profile = await response.json() as BackendUserProfile;
  if (profile.firebaseUid !== user.uid || !["ADMIN", "USER"].includes(profile.role)) {
    throw new Error("Your account profile could not be verified.");
  }
  return profile;
}


export function AuthProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [user, setUser] =
    useState<User | null>(null);


  const userRef =
    useRef<User | null>(null);

  userRef.current = user;



  const refreshProfile =
    useCallback(
      async (
        nextUser = userRef.current
      ) => {

        if (!nextUser) {
          setProfile(null);
          return;
        }

        const backendProfile = await syncBackendProfile(nextUser);
        let firestoreProfile = fallbackProfile(nextUser);
        if (db) {
          try {
            firestoreProfile = await syncUserProfile(db, nextUser);
          } catch (reason) {
            console.error("[profile] Optional Firestore profile sync failed.", reason);
          }
        }
        const nextProfile: UserProfile = {
          ...firestoreProfile,
          accountStatus: backendProfile.accountStatus,
          createdAt: backendProfile.createdAt,
          displayName: backendProfile.name ?? firestoreProfile.displayName,
          email: backendProfile.email,
          role: backendProfile.role === "ADMIN" ? "admin" : "user",
          updatedAt: backendProfile.updatedAt,
        };


        if (
          nextProfile.accountStatus ===
          "disabled"
        ) {
          await signOut(auth!);
          setProfile(null);

          throw new Error(
            "This account has been disabled."
          );
        }


        if (
          auth?.currentUser?.uid ===
          nextUser.uid
        ) {
          setProfile(nextProfile);
        }

      },
      []
    );



  const syncCurrentUser =
    useCallback(async () => {

      const currentUser =
        auth?.currentUser;


      if (!currentUser) {
        throw new Error(
          "Sign in before synchronizing."
        );
      }


      const token =
        await currentUser.getIdToken(true);


      const response =
        await fetchBackend(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/users/sync`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                currentUser.displayName ||
                currentUser.email ||
                "",
            }),
          }
        );


      if (!response.ok) {
        let message = "";
        try {
          const payload: unknown = await response.json();
          if (payload && typeof payload === "object") {
            const candidate = payload as { error?: unknown; message?: unknown };
            if (typeof candidate.error === "string") message = candidate.error;
            else if (typeof candidate.message === "string") message = candidate.message;
          }
        } catch {
          // Use the HTTP status when the backend does not return JSON.
        }
        const detail = message ? `: ${message}` : "";
        throw new Error(
          `Account synchronization failed (HTTP ${response.status})${detail}`
        );
      }

    }, []);



  useEffect(() => {

    if (!auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let latestRequest = 0;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      await firebasePersistenceReady;
      if (cancelled) return;

      unsubscribe = onIdTokenChanged(
        auth,
        async (nextUser) => {
          const request = ++latestRequest;
          const isCurrent = () => !cancelled && request === latestRequest;

          if (!isCurrent()) return;
          setUser(nextUser);
          setProfile(null);

          if (!nextUser) {
            setLoading(false);
            setError("");
            return;
          }

          setLoading(true);

          try {
            await refreshProfile(nextUser);
            if (isCurrent()) setError("");
          } catch (reason) {
            if (isCurrent()) {
              const message = authMessage(reason);
              setError(message);
              if (
                auth?.currentUser &&
                (message === "Your session expired. Please sign in again." ||
                  message === "This account has been disabled.")
              ) {
                await signOut(auth);
                setUser(null);
                setProfile(null);
              }
            }
          } finally {
            if (isCurrent()) setLoading(false);
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };


  }, [refreshProfile]);



  const value =
    useMemo<AuthContextValue>(() => ({

      changePassword:
        async (
          currentPassword,
          nextPassword
        ) => {

          if (
            !auth?.currentUser ||
            !auth.currentUser.email
          ) {
            throw new Error(
              "Password change unavailable."
            );
          }


          validatePassword(nextPassword);


          await reauthenticateWithCredential(
            auth.currentUser,
            EmailAuthProvider.credential(
              auth.currentUser.email,
              currentPassword
            )
          );


          await updatePassword(
            auth.currentUser,
            nextPassword
          );

        },



      createAccount:
        async (
          email,
          password,
          confirmation,
          name
        ) => {

          if (!auth)
            throw new Error(
              "Firebase authentication is not configured."
            );


          setError("");


          if (!name.trim())
            throw new Error(
              "Enter your display name."
            );


          if (!emailPattern.test(email.trim()))
            throw new Error(
              "Enter a valid email address."
            );


          validatePassword(password);


          if(password !== confirmation)
            throw new Error(
              "Passwords do not match."
            );


          try {

            const credential =
              await createUserWithEmailAndPassword(
                auth,
                email.trim(),
                password
              );


            await updateProfile(
              credential.user,
              {
                displayName:
                  name.trim(),
              }
            );


            await sendEmailVerification(
              credential.user
            );

            await refreshProfile(credential.user);


          } catch(reason) {

            const text =
              authMessage(reason);

            setError(text);

            throw new Error(text);
          }

        },



      login:
        async (
          email,
          password
        ) => {

          if (!auth)
            throw new Error(
              "Firebase authentication is not configured."
            );


          setError("");


          try {

            const credential =
              await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
              );


            await refreshProfile(
              credential.user
            );


            setError("");


          } catch(reason) {

            const text =
              authMessage(reason);

            setError(text);

            throw new Error(text);

          }

        },



      loginWithGoogle:
        async () => {

          if(
            !auth ||
            !googleProvider
          )
          throw new Error(
            "Firebase authentication is not configured."
          );


          setError("");


          try {
            const credential = await signInWithPopup(auth, googleProvider);
            await refreshProfile(credential.user);
          } catch (reason) {
            const text = authMessage(reason);
            setError(text);
            throw new Error(text);
          }

        },



      logout:
        async () => {

          if(!auth)
            return;


          await signOut(auth);

          setUser(null);
          setProfile(null);
          setError("");

        },



      logoutAllSessions:
        async () => {
          if (!auth?.currentUser) return;
          let revokeError: Error | null = null;
          try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch("/api/account/revoke-sessions", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
              revokeError = new Error("Other sessions could not be revoked.");
            }
          } catch {
            revokeError = new Error("Other sessions could not be revoked.");
          } finally {
            await signOut(auth);
            setUser(null);
            setProfile(null);
            setError("");
          }
          if (revokeError) throw revokeError;

        },


      enabled: firebaseEnabled,

      authError: error,

      error,

      loading,


      profile,

      user,

      userProfile:
        profile,


      role:
        profile?.role ?? "user",


      isAdmin:
        profile?.role === "admin",


      requiresEmailVerification:
        unverified(user),



      refreshProfile:
        () => refreshProfile(),


      syncCurrentUser,


      requestPasswordReset:
        async(email)=>{
          if (!auth) throw new Error("Firebase authentication is not configured.");
          try {
            await sendPasswordResetEmail(auth, email.trim(), {
              url: `${window.location.origin}/reset-password`,
              handleCodeInApp: true,
            });
          } catch (reason) {
            const text = authMessage(reason);
            setError(text);
            throw new Error(text);
          }

        },


      resetPassword:
        async(code, nextPassword, confirmation)=>{
          if (!auth) throw new Error("Firebase authentication is not configured.");
          validatePassword(nextPassword);
          if (nextPassword !== confirmation) throw new Error("Passwords do not match.");
          try {
            await confirmPasswordReset(auth, code, nextPassword);
          } catch (reason) {
            const text = authMessage(reason);
            setError(text);
            throw new Error(text);
          }
        },


      resendVerificationEmail:
        async()=>{

          if(user)
            await sendEmailVerification(user);

        },


      refreshVerificationStatus:
        async()=>{

          await reload(auth!.currentUser!);

          setUser(
            auth!.currentUser
          );
          await refreshProfile(auth!.currentUser);

          return Boolean(
            auth!.currentUser?.emailVerified
          );

        },


      updateUserProfile:
        async(input)=>{

          if(!user || !db)
            throw new Error(
              "Sign in first."
            );


          await updateProfile(
            user,
            {
              displayName:
                input.displayName,
            }
          );


          await updateProfileFields(
            db,
            user,
            {
              ...input,
              photoURL:
                input.photoURL ??
                profile?.photoURL ??
                user.photoURL ??
                "",
              preferences:
                input.preferences ??
                profile?.preferences ??
                {},
            }
          );


          await refreshProfile(user);

        },


      setWishlistBook:
        async()=>{

          throw new Error(
            "Wishlist syncing is not available yet."
          );

        },

    }),
    [
      error,
      loading,
      profile,
      refreshProfile,
      syncCurrentUser,
      user,
    ]);



  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

}



export function useAuth(){

  const value =
    useContext(AuthContext);


  if(!value)
    throw new Error(
      "useAuth must be used within AuthProvider."
    );


  return value;

}