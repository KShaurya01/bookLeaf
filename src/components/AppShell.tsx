"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

type NavItem = { href: string; label: string };

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Only the most specific matching nav item is active (avoids /tickets + /tickets/new both lighting up). */
function isNavActive(pathname: string, href: string, allHrefs: string[]) {
  if (!pathMatches(pathname, href)) return false;
  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      pathMatches(pathname, other)
  );
}

export function AppShell({
  title,
  role,
  name,
  nav,
  children,
}: {
  title: string;
  role: string;
  name: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hrefs = nav.map((item) => item.href);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>BookLeaf</strong>
            <p>{title}</p>
          </div>
        </div>
        <nav aria-label="Primary">
          {nav.map((item) => {
            const active = isNavActive(pathname, item.href, hrefs);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div>
            <strong>{name}</strong>
            <p>{role}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
