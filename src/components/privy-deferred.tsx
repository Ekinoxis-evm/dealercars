"use client";

import dynamic from "next/dynamic";
import type { PriceQuote, RetailListing } from "@/lib/types";

/**
 * Lazy boundaries for every component that touches Privy.
 *
 * `@privy-io/react-auth` costs ~726 kB of first-load JS, because the SDK drags
 * the whole wallet stack (@reown/appkit, viem, keccak, x402) along to do email
 * login. Statically imported, that lands on the critical path of the two pages
 * a member actually converts on — measured at 832 kB for /cars/[id] against
 * 106 kB for the same page behind these boundaries.
 *
 * SSR is deliberately left ON. These components render server-side as before,
 * so the plan figures and their Reg Z disclosure are still in the HTML — only
 * the hydration chunk is deferred. Do NOT add `ssr: false` here: the down
 * payment and monthly payment are advertising trigger terms, and moving them
 * out of the server HTML would take the disclosure with them.
 *
 * If a new component imports @privy-io/react-auth, it belongs here too.
 */

function Skeleton({ height }: { height: string }) {
  return (
    <div
      className={`${height} animate-pulse border border-rule bg-paper-raised`}
      aria-hidden="true"
    />
  );
}

const PlanPickerImpl = dynamic(
  () => import("./PlanPicker").then((m) => m.PlanPicker),
  { loading: () => <Skeleton height="h-64" /> }
);

const VisitSchedulerImpl = dynamic(
  () => import("./VisitScheduler").then((m) => m.VisitScheduler),
  { loading: () => <Skeleton height="h-32" /> }
);

const ProfileFormImpl = dynamic(
  () => import("./ProfileForm").then((m) => m.ProfileForm),
  { loading: () => <Skeleton height="h-96" /> }
);

const AdminInventoryImpl = dynamic(
  () => import("./AdminInventory").then((m) => m.AdminInventory),
  { loading: () => <Skeleton height="h-96" /> }
);

const AdminCarEditorImpl = dynamic(
  () => import("./AdminCarEditor").then((m) => m.AdminCarEditor),
  { loading: () => <Skeleton height="h-screen" /> }
);

export function PlanPicker(props: {
  listing: RetailListing;
  initialQuote: PriceQuote;
}) {
  return <PlanPickerImpl {...props} />;
}

export function VisitScheduler(props: { listingId: string }) {
  return <VisitSchedulerImpl {...props} />;
}

export function ProfileForm() {
  return <ProfileFormImpl />;
}

export function AdminInventory() {
  return <AdminInventoryImpl />;
}

export function AdminCarEditor(props: { listingId?: string }) {
  return <AdminCarEditorImpl {...props} />;
}
