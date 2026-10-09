import { headers } from "next/headers";
import { AdminShell } from "@/components/AdminShell";
import { AdminBaseProvider } from "@/components/AdminBase";

/**
 * Every admin route sits behind one gate. See AdminShell.
 *
 * On the admin host the links are rooted at `/`; see AdminBase.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminHost = process.env.ADMIN_HOST;
  const onAdminHost = !!adminHost && (await headers()).get("host") === adminHost;
  return (
    <AdminBaseProvider base={onAdminHost ? "" : "/admin"}>
      <AdminShell>{children}</AdminShell>
    </AdminBaseProvider>
  );
}
