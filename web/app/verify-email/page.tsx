"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Shell } from "@/components/shell";

export default function VerifyEmailPage() {
  const { loading, logout, refreshVerificationStatus, resendVerificationEmail, requiresEmailVerification, syncCurrentUser, user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<"refresh" | "resend" | "signout" | null>(null);
  const [status, setStatus] = useState("");

  const refreshStatus = useCallback(async () => {
    setBusy("refresh");
    setStatus("");
    try {
      const verified = await refreshVerificationStatus();
      if (verified) {
        await syncCurrentUser();
        setStatus("Your email has been verified.");
        router.push("/profile");
      } else {
        setStatus("Your email is not verified yet. Please open the link from your email and try again.");
      }
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Verification status could not be refreshed.");
    } finally {
      setBusy(null);
    }
  }, [refreshVerificationStatus, router, syncCurrentUser]);

  const resend = useCallback(async () => {
    setBusy("resend");
    setStatus("");
    try {
      await resendVerificationEmail();
      setStatus("Verification email sent.");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Verification email could not be sent.");
    } finally {
      setBusy(null);
    }
  }, [resendVerificationEmail]);

  const signOut = useCallback(async () => {
    setBusy("signout");
    try {
      await logout();
      router.push("/login");
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : "Could not sign out.");
    } finally {
      setBusy(null);
    }
  }, [logout, router]);

  return (
    <Shell>
      <section className="page-introduction settings-introduction">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Verify your email</h1>
          {loading ? <p>Checking your account…</p> : !user ? <p>You need to sign in before verifying your email.</p> : !requiresEmailVerification ? <p>Your email is already verified.</p> : <><p>A verification link has been sent to your email address.</p><p><strong>{user.email}</strong></p></>}
          {!loading && !user && <Link className="primary-button" href="/login">Go to sign in</Link>}
          {!loading && user && !requiresEmailVerification && <Link className="primary-button" href="/profile">Continue to your account</Link>}
          {!loading && requiresEmailVerification && <div className="auth-actions"><button className="primary-button" disabled={busy !== null} onClick={() => void refreshStatus()} type="button">{busy === "refresh" ? "Checking…" : "I've verified my email"}</button><button className="outline-button" disabled={busy !== null} onClick={() => void resend()} type="button">{busy === "resend" ? "Sending…" : "Resend verification email"}</button><button className="text-link" disabled={busy !== null} onClick={() => void signOut()} type="button">{busy === "signout" ? "Signing out…" : "Sign out"}</button></div>}
          {status && <p className="status-message" role="status">{status}</p>}
        </div>
      </section>
    </Shell>
  );
}
