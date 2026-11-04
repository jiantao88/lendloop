"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { errorText } from "@/lib/errors";

const LINKS = [
  ["/board", "All tools"],
  ["/board/listings", "My listings"],
  ["/board/requests", "My requests"],
  ["/board/incoming", "Incoming requests"],
];

export function BoardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="shell">
      <EnsureUser />
      <header className="topbar">
        <Link className="brand" href="/">
          <strong>LendLoop</strong>
          <span>Borrow what you need. Lend what you don’t.</span>
        </Link>
        <UserButton />
      </header>
      <Nav />
      {children}
    </main>
  );
}

function EnsureUser() {
  const ensure = useMutation(api.users.ensure);
  const { isLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void ensure().catch((reason: unknown) => setError(errorText(reason)));
  }, [ensure, isLoaded, isSignedIn]);
  if (!error) return null;
  return (
    <p className="banner" role="alert">
      {error}
    </p>
  );
}

function Nav() {
  const pathname = usePathname();
  const me = useQuery(api.users.me, {});
  return (
    <nav className="board-nav" aria-label="Board">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
      {me?.role === "admin" ? (
        <Link href="/board/admin" aria-current={pathname === "/board/admin" ? "page" : undefined}>
          Admin
        </Link>
      ) : null}
    </nav>
  );
}
