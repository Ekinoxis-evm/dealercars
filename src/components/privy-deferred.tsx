"use client";

import dynamic from "next/dynamic";
/**
 * Lazy boundaries for every component that touches Privy.
 *
 * `@privy-io/react-auth` costs ~726 kB of first-load JS, because the SDK drags
 * the whole wallet stack (@reown/appkit, viem, keccak, x402) along to do email
 * login. Statically imported, that lands on the critical path of the two pages
 * a member actually converts on — measured at 832 kB for /marketplace/[id]
 * against 106 kB for the same page behind these boundaries.
 *
 * `PlanPicker` is NOT here any more: it hands the plan to WhatsApp rather than
 * to checkout, so it no longer imports Privy and is imported directly.
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

const ProfileFormImpl = dynamic(
  () => import("./ProfileForm").then((m) => m.ProfileForm),
  { loading: () => <Skeleton height="h-96" /> }
);

const AdminShellImpl = dynamic(
  () => import("./AdminShell").then((m) => m.AdminShell),
  { loading: () => <Skeleton height="h-64" /> }
);

const AdminInventoryImpl = dynamic(
  () => import("./AdminInventory").then((m) => m.AdminInventory),
  { loading: () => <Skeleton height="h-96" /> }
);

const AdminDealerEditorImpl = dynamic(
  () => import("./AdminDealerEditor").then((m) => m.AdminDealerEditor),
  { loading: () => <Skeleton height="h-96" /> }
);

const AdminAdminsImpl = dynamic(
  () => import("./AdminAdmins").then((m) => m.AdminAdmins),
  { loading: () => <Skeleton height="h-64" /> }
);

const AdminCarEditorImpl = dynamic(
  () => import("./AdminCarEditor").then((m) => m.AdminCarEditor),
  { loading: () => <Skeleton height="h-screen" /> }
);

export function ProfileForm() {
  return <ProfileFormImpl />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminShellImpl>{children}</AdminShellImpl>;
}

export function AdminInventory() {
  return <AdminInventoryImpl />;
}

export function AdminDealerEditor() {
  return <AdminDealerEditorImpl />;
}

export function AdminAdmins() {
  return <AdminAdminsImpl />;
}

export function AdminCarEditor(props: { listingId?: string }) {
  return <AdminCarEditorImpl {...props} />;
}
