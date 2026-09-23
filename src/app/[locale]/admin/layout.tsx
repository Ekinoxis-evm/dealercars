import { AdminShell } from "@/components/AdminShell";

/**
 * Every admin route sits behind one gate. See AdminShell.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
