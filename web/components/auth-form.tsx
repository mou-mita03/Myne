"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

type AuthFormProps = {
  mode: "login" | "signup";
};

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirmation", string>>;

function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: string) {
  if (password.length < 10) return "Use at least 10 characters.";
  if (!/[a-z]/.test(password)) return "Include at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/\d/.test(password)) return "Include at least one number.";
  return "";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { createAccount, enabled, error: authError, loading: authLoading, login, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || authLoading) return;

    const nextErrors: FieldErrors = {};
    if (mode === "signup" && !name.trim()) nextErrors.name = "Enter your name.";
    if (!validateEmail(email)) nextErrors.email = "Enter a valid email address.";
    if (mode === "signup") {
      const passwordError = validatePassword(password);
      if (passwordError) nextErrors.password = passwordError;
      if (password !== confirmation) nextErrors.confirmation = "Passwords do not match.";
    } else if (!password) {
      nextErrors.password = "Enter your password.";
    }
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === "signup") {
        await createAccount(email, password, confirmation, name);
        router.replace("/verify-email");
      } else {
        await login(email, password);
        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(safeNextPath(next));
      }
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [authLoading, confirmation, createAccount, email, login, mode, name, password, router, submitting]);

  const googleLogin = useCallback(async () => {
    if (submitting || authLoading) return;
    setFormError("");
    setSubmitting(true);
    try {
      await loginWithGoogle();
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeNextPath(next));
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [authLoading, loginWithGoogle, router, submitting]);

  const busy = submitting || authLoading;
  const title = mode === "login" ? "Welcome back" : "Create your account";

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">Myne account</p>
          <h1>{title}</h1>
          <p>{mode === "login" ? "Continue your reading journey." : "Save your library and read anywhere."}</p>
        </div>
        {!enabled && <p className="status-message" role="alert">Authentication is not configured for this environment.</p>}
        <form className="auth-form auth-form-professional" onSubmit={submit} noValidate>
          {mode === "signup" && (
            <label>
              Full name
              <input autoComplete="name" disabled={busy} onChange={(event) => setName(event.target.value)} value={name} />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </label>
          )}
          <label>
            Email address
            <input autoComplete="email" disabled={busy} onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </label>
          <label>
            Password
            <span className="password-field">
              <input autoComplete={mode === "login" ? "current-password" : "new-password"} disabled={busy} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} value={password} />
              <button aria-label={showPassword ? "Hide password" : "Show password"} className="password-toggle" disabled={busy} onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? "Hide" : "Show"}</button>
            </span>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </label>
          {mode === "signup" && (
            <label>
              Confirm password
              <span className="password-field">
                <input autoComplete="new-password" disabled={busy} onChange={(event) => setConfirmation(event.target.value)} type={showConfirmation ? "text" : "password"} value={confirmation} />
                <button aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"} className="password-toggle" disabled={busy} onClick={() => setShowConfirmation((visible) => !visible)} type="button">{showConfirmation ? "Hide" : "Show"}</button>
              </span>
              {fieldErrors.confirmation && <span className="field-error">{fieldErrors.confirmation}</span>}
            </label>
          )}
          {(formError || authError) && <p className="status-message auth-error" role="alert">{formError || authError}</p>}
          <button className="primary-button auth-submit" disabled={busy || !enabled} type="submit">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="outline-button auth-submit" disabled={busy || !enabled} onClick={() => void googleLogin()} type="button">{busy ? "Please wait…" : "Continue with Google"}</button>
        {mode === "login" && <Link className="text-link auth-secondary-link" href="/forgot-password">Forgot your password?</Link>}
        <p className="auth-switch">
          {mode === "login" ? "New to Myne?" : "Already have an account?"}{" "}
          <Link href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link>
        </p>
      </div>
    </section>
  );
}
