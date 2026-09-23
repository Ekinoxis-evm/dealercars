"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { AdminGate } from "./AdminGate";

const INPUT =
  "w-full border border-rule-strong bg-paper px-3 py-2 font-mono text-[0.875rem] text-ink focus:outline-none";

interface AdminRow {
  id: string;
  email: string | null;
  user_id: string | null;
  label: string;
  bound_at: string | null;
  created_at: string;
}

/**
 * The admins, and the form that invites another.
 *
 * An invitation is an email; it starts working the first time that person
 * signs in with it. "Pending" here means exactly that — nobody has signed in
 * with the address yet.
 */
export function AdminAdmins() {
  const { ready, user } = useAuth();
  const authenticated = user !== null;
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ admins: AdminRow[]; me: string }>("/api/admin/admins");
      setAdmins(res.admins);
      setMe(res.me);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else setError(e instanceof ApiError ? e.message : "Could not load admins.");
    }
  }, []);

  useEffect(() => {
    if (ready && authenticated) load();
  }, [ready, authenticated, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setReasons(null);
    try {
      await apiFetch("/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ email, label }),
      });
      setEmail("");
      setLabel("");
      await load();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setReasons(e.reasons ?? null);
      } else setError("Could not add that admin.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AdminRow) {
    setError(null);
    try {
      await apiFetch(`/api/admin/admins/${row.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not remove that admin.");
    }
  }

  return (
    <AdminGate what="manage admins" forbidden={forbidden}>
      <form onSubmit={add} className="border border-rule-strong bg-paper-raised px-4 py-4 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">Add an admin</h2>
        <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
          They sign in with this email and its code, and are an admin from that
          moment. Nothing to send them; the address is the invitation.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.5fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${INPUT} mt-1`} />
          </label>
          <label className="block">
            <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">Name</span>
            <input required value={label} onChange={(e) => setLabel(e.target.value)} className={`${INPUT} mt-1`} placeholder="For the audit trail" />
          </label>
          <button type="submit" disabled={busy} className="bg-accent px-4 py-2 font-display text-sm font-bold tracking-tight text-accent-ink disabled:opacity-50">
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
        {error && (
          <div role="alert" className="mt-3 font-serif text-[0.9375rem] text-accent">
            {error}
            {reasons && (
              <ul className="mt-1 list-disc pl-5 text-ink-muted">
                {reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            )}
          </div>
        )}
      </form>

      <ul className="mt-6 divide-y divide-rule border-y border-rule-strong">
        {(admins ?? []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-display text-base font-bold tracking-tight">
                {a.label}
                {a.id === me && <span className="ml-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-accent">you</span>}
              </p>
              <p className="truncate font-mono text-[0.75rem] text-ink-muted">
                {a.email ?? a.user_id}
                {" · "}
                {a.user_id ? "active" : "pending — has not signed in yet"}
              </p>
            </div>
            {a.id !== me && (
              <button
                type="button"
                onClick={() => remove(a)}
                className="border border-rule-strong px-3 py-1.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted hover:border-accent hover:text-accent"
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {admins && admins.length === 0 && (
          <li className="py-3 font-serif text-ink-muted">No admins yet.</li>
        )}
      </ul>
    </AdminGate>
  );
}
