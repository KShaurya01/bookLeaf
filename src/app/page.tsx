import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === Role.ADMIN) redirect("/admin/tickets");
  redirect("/author/books");
}
