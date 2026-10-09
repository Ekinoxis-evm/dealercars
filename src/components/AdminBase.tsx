"use client";

import { createContext, useContext } from "react";

/**
 * Where the admin's links start.
 *
 * On the admin host (ADMIN_HOST) the admin sits at the root — `/`, `/cars/new` —
 * and the middleware rewrites to the real pages. Everywhere else (previews,
 * localhost) it is `/admin/...` and the middleware adds the locale. The layout
 * decides which on the server, from the request host, so the first render and
 * hydration agree.
 */
const AdminBaseContext = createContext("/admin");

export function AdminBaseProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <AdminBaseContext.Provider value={base}>{children}</AdminBaseContext.Provider>;
}

/** `adminHref("/cars/new")` → `/cars/new` on the admin host, `/admin/cars/new` elsewhere. */
export function useAdminHref(): (path: string) => string {
  const base = useContext(AdminBaseContext);
  return (path) => (path === "/" ? base || "/" : `${base}${path}`);
}
