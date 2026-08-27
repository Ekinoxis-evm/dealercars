"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { MemberProfile } from "@/lib/types";

/**
 * The membership subscription.
 *
 * This is the one payment in the product that is ours rather than the
 * dealer's: it buys access to the Monday auction drop, and it is emphatically
 * not part of the price of any car. Cars on the lot are interest-free and can
 * be bought without ever subscribing — saying so plainly here is what keeps
 * the subscription from reading as a fee attached to credit.
 */
export function MembershipCard() {
  const { ready, authenticated } = usePrivy();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    apiFetch<{ profile: MemberProfile }>("/api/profile")
      .then(({ profile }) => {
        if (!cancelled) setProfile(profile);
      })
      .catch(() => {
        /* the profile form surfaces load errors; don't double-report */
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated]);

  if (!ready || !authenticated) return null;

  const active =
    profile?.membershipStatus === "active" ||
    profile?.membershipStatus === "trialing";

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(
        "/api/checkout/membership",
        { method: "POST" }
      );
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <section className="border border-rule-strong bg-paper-raised">
      <header className="border-b border-rule-strong px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          Auction access
        </h2>
      </header>
      <div className="px-4 py-5 sm:px-6">
        {active ? (
          <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
            Your membership is{" "}
            <span className="font-mono text-[0.875rem] text-light-green">
              {profile?.membershipStatus}
            </span>
            . Four matched cars drop every Monday; you commit by Wednesday and
            the dealer bids Thursday.
          </p>
        ) : (
          <>
            <p className="max-w-prose font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
              Consumers can&rsquo;t bid at wholesale auctions. A membership
              turns your verified budget into a maximum auction bid and puts
              four matched cars in front of you every Monday, which a licensed
              partner dealer bids on for you.
            </p>
            <p className="mt-2 max-w-prose font-serif text-[0.875rem] leading-relaxed text-ink-muted">
              You don&rsquo;t need this to buy a car that&rsquo;s already on the
              lot. Those are interest-free and open to anyone.
            </p>
            <button
              type="button"
              onClick={subscribe}
              disabled={busy}
              className="mt-4 border border-rule-strong bg-paper px-5 py-2.5 font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink hover:border-accent hover:text-accent disabled:opacity-40"
            >
              {busy ? "Opening checkout…" : "Subscribe"}
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="mt-3 font-serif text-[0.875rem] text-accent">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
