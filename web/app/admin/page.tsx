"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Shell } from "@/components/shell";

type AdminSummary = { books: number; reviews: number; users: number };

export default function AdminPage() {
  const { error: authError, isAdmin, loading, logout, user, userProfile } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=%2Fadmin");
  }, [isAdmin, loading, router, user, userProfile]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let current = true;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          await logout();
          if (current) router.replace("/login?next=%2Fadmin");
          return;
        }
        if (response.status === 403) {
          if (current) setError("Your account is not authorized to access administration.");
          return;
        }
        if (!response.ok) throw new Error("Admin dashboard data could not be loaded.");
        const data = await response.json() as AdminSummary;
        if (current) setSummary(data);
      } catch (reason) {
        if (current) setError(reason instanceof Error ? reason.message : "Admin dashboard data could not be loaded.");
      }
    })();
    return () => { current = false; };
  }, [isAdmin, logout, router, user]);

  if (loading) {
    return <Shell><section className="page-introduction"><p>Checking account access…</p></section></Shell>;
  }

  if (!user || !userProfile || !isAdmin) {
    return (
      <Shell>
        <section className="page-introduction">
          <p className="eyebrow">Access denied</p>
          <h1>Administrator access is required</h1>
          <p>{authError || "Your account does not have the administrator role."}</p>
        </section>
      </Shell>
    );
  }

  const actionUnavailable = (action: string) => setNotice(`${action} is ready for its admin workflow to be connected.`);

  return (
    <Shell>
      <section className="page-introduction">
        <div><p className="eyebrow">Administration</p><h1>Myne admin dashboard</h1><p>Manage the server-controlled Myne catalogue and user accounts.</p></div>
      </section>
      <section className="settings-dashboard" aria-label="Admin dashboard">
        <article className="settings-card"><p className="eyebrow">Accounts</p><h2>Total Users</h2><strong>{summary?.users ?? "—"}</strong></article>
        <article className="settings-card"><p className="eyebrow">Catalogue</p><h2>Total Books</h2><strong>{summary?.books ?? "—"}</strong></article>
        <article className="settings-card"><p className="eyebrow">Community</p><h2>Total Reviews</h2><strong>{summary?.reviews ?? "—"}</strong></article>
      </section>
      <section className="settings-card" aria-label="Admin actions">
        <h2>Administration</h2>
        <div className="auth-actions">
          <button className="primary-button" onClick={() => actionUnavailable("Upload Book")} type="button">Upload Book</button>
          <button className="outline-button" onClick={() => actionUnavailable("Manage Books")} type="button">Manage Books</button>
          <button className="outline-button" onClick={() => actionUnavailable("Manage Users")} type="button">Manage Users</button>
        </div>
        {error && <p className="status-message" role="alert">{error}</p>}
        {notice && <p className="status-message" role="status">{notice}</p>}
      </section>
    </Shell>
  );
}
