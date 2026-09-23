"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { SignIn } from "./SignIn";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/finance";
import { VisitScheduler } from "./VisitScheduler";
import { useI18n } from "@/i18n/client";

/**
 * Buy Auction Access, then book the appointment it entitles you to.
 *
 * Both halves live here because they are one transaction from the member's
 * side: pay for the service, then sit down with the broker. Splitting them
 * across two components would mean two sources of truth about whether the
 * money actually moved.
 *
 * Entitlement is read from the server, never from the redirect. Stripe returns
 * the member on `?paid=1`, which proves nothing — the tab can be closed and
 * the URL forged — so that flag only softens the wording while the webhook
 * catches up. The webhook is the only thing that can mark a payment succeeded,
 * and the visits route checks the same fact before it will book a slot, so the
 * button and the booking gate cannot disagree.
 *
 * No <RegZDisclosure /> here, and that is a decision rather than an omission.
 * A one-off service price states no down payment, no periodic payment, no
 * number of payments and no finance charge, so it trips none of the Reg Z
 * advertising trigger terms in 12 CFR 1026.24(d)(1). If this ever starts
 * offering the fee in instalments, the disclosure arrives with them — see
 * `auction-access.ts`.
 */
type Status = { active: boolean; pending: boolean };

export function AuctionAccessCheckout({
  feeCents,
  address,
}: {
  feeCents: number;
  address?: string;
}) {
  const { dict } = useI18n();
  const { ready, user } = useAuth();
  const authenticated = user !== null;
  const [wantsSignIn, setWantsSignIn] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authenticated) return;
    try {
      const data = await apiFetch<Status>("/api/checkout/auction-access");
      setStatus(data);
    } catch {
      // Leave the buy button up rather than claiming an entitlement we could
      // not confirm. Checkout itself rejects a duplicate purchase anyway.
      setStatus({ active: false, pending: false });
    }
  }, [authenticated]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void refresh();
  }, [ready, authenticated, refresh]);

  // Coming back from Stripe, the webhook may still be in flight. Poll briefly
  // rather than making the member work out that they should refresh.
  useEffect(() => {
    if (!authenticated) return;
    if (new URLSearchParams(window.location.search).get("paid") !== "1") return;
    if (status?.active) return;

    const timer = setInterval(() => void refresh(), 2000);
    const stop = setTimeout(() => clearInterval(timer), 30_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [authenticated, status?.active, refresh]);

  async function buy() {
    setError(null);
    if (!authenticated) {
      setWantsSignIn(true);
      return;
    }
    setBusy(true);
    try {
      const { url } = await apiFetch<{ url: string }>(
        "/api/checkout/auction-access",
        { method: "POST" }
      );
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : dict.auction.couldNotStart);
      setBusy(false);
    }
  }

  // ---- paid: straight to booking ----------------------------------------
  if (status?.active) {
    return (
      <div className="flex flex-col gap-5">
        <div
          role="status"
          className="border-l-2 border-accent bg-paper-raised px-4 py-3"
        >
          <p className="font-display text-base font-bold tracking-tight">
            {dict.auction.active}
          </p>
          <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
            {dict.auction.activeLede}
          </p>
        </div>
        <VisitScheduler address={address} />
      </div>
    );
  }

  return (
    <div>
      {wantsSignIn && !authenticated && (
        <div className="mb-4">
          <SignIn />
        </div>
      )}
      <button
        type="button"
        onClick={buy}
        disabled={busy || !ready}
        className="w-full border border-accent bg-accent px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {busy
          ? dict.plan.opening
          : !ready
            ? "…"
            : authenticated
              ? dict.auction.buy(formatMoney(feeCents))
              : dict.plan.signIn}
      </button>

      <p className="mt-2 font-serif text-[0.8125rem] leading-snug text-ink-muted">
        {dict.auction.buyNote}
      </p>

      {status?.pending && (
        <p
          role="status"
          className="mt-3 border-l-2 border-rule-strong bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-snug text-ink-muted"
        >
          {dict.auction.pending}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 border-l-2 border-accent bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-snug text-ink"
        >
          {error}
        </p>
      )}
    </div>
  );
}
