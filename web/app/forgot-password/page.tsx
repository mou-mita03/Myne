"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Shell } from "@/components/shell";

export default function ForgotPasswordPage() {
  const { enabled, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password reset email could not be sent. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, loading, requestPasswordReset]);

  return (
    <Shell>
      <section className="page-introduction settings-introduction">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Forgot password</h1>
          {sent ? (
            <p className="status-message" role="status">Password reset email sent. Check your inbox.</p>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <p>Enter your email to reset your password</p>
              {!enabled ? <p className="settings-note">Firebase authentication is not configured.</p> : <>
                <label>Email<input autoComplete="email" disabled={loading} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
                <button className="primary-button" disabled={loading} type="submit">{loading ? "Sending…" : "Send reset email"}</button>
              </>}
              {error && <p className="status-message" role="alert">{error}</p>}
            </form>
          )}
          <Link className="text-link" href="/login">Back to login</Link>
        </div>
      </section>
    </Shell>
  );
}
