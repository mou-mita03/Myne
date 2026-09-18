"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Shell } from "@/components/shell";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get("oobCode") ?? "");
  }, []);

  const submit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      if (!code) throw new Error("This password reset link is invalid.");
      await resetPassword(code, password, confirmation);
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Password could not be reset.");
    } finally {
      setLoading(false);
    }
  }, [code, confirmation, loading, password, resetPassword]);

  return (
    <Shell>
      <section className="page-introduction settings-introduction">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Reset password</h1>
          {complete ? (
            <>
              <p className="status-message" role="status">Your password has been reset.</p>
              <Link className="primary-button" href="/login">Continue to login</Link>
            </>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <label>New password<input autoComplete="new-password" disabled={loading} minLength={10} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
              <label>Confirm password<input autoComplete="new-password" disabled={loading} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></label>
              <button className="primary-button" disabled={loading} type="submit">{loading ? "Resetting…" : "Reset password"}</button>
              {error && <p className="status-message" role="alert">{error}</p>}
            </form>
          )}
          {!complete && <Link className="text-link" href="/login">Back to login</Link>}
        </div>
      </section>
    </Shell>
  );
}
