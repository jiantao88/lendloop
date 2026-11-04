"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS, type Category } from "@/lib/domain/types";

export function PublicCatalog() {
  const tools = useQuery(api.tools.listAvailablePublic, {});

  return (
    <main className="shell">
      <header className="topbar">
        <p className="brand">
          <strong>LendLoop</strong>
          <span>Neighborhood tool board</span>
        </p>
        <div className="row">
          <SignedOut>
            <SignInButton mode="redirect" forceRedirectUrl="/board">
              <button type="button">Sign in to lend or borrow</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link className="button" href="/board">
              Open your board
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </header>
      <h1>Borrow what you need. Lend what you don’t.</h1>
      <p className="lede">
        A read-only list of tools neighbors are willing to lend. Names and categories only — owner details stay off this page.
      </p>
      {tools === undefined ? <p className="meta">Loading the board…</p> : null}
      {tools && tools.length === 0 ? <p className="meta">No tools are available right now.</p> : null}
      <ul className="catalog">
        {tools?.map((tool, index) => (
          <li className="card" key={`${tool.category}:${tool.name}:${index}`}>
            <h2>{tool.name}</h2>
            <span className="pill">{CATEGORY_LABELS[tool.category as Category]}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
