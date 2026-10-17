import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

export default async function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== Role.AUTHOR) redirect("/login");

  return (
    <AppShell
      title="Author Portal"
      role="Author"
      name={session.name}
      nav={[
        { href: "/author/books", label: "My Books" },
        { href: "/author/tickets/new", label: "Submit Query" },
        { href: "/author/tickets", label: "My Tickets" },
      ]}
    >
      {children}
    </AppShell>
  );
}
