import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) redirect("/login");

  return (
    <AppShell
      title="Ops Dashboard"
      role="Admin"
      name={session.name}
      nav={[{ href: "/admin/tickets", label: "Ticket Queue" }]}
    >
      {children}
    </AppShell>
  );
}
