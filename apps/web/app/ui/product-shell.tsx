"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { appNavigation } from "./scaffold-data";

type ProductShellProps = {
  activePath: string;
  children: ReactNode;
};

export function ProductShell({ activePath, children }: ProductShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`workspace-page ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="workspace-shell brilhio-shell">
        <aside className="workspace-sidebar brilhio-card">
          <div className="sidebar-top">
            <Link href="/" className="brand-mark">
              {collapsed ? "R" : "Brilhio"}
            </Link>
            <button
              className="sidebar-toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "→" : "←"}
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Product navigation">
            {appNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${activePath === item.href ? "nav-link-active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <strong>{item.label}</strong>
              </Link>
            ))}
          </nav>

          <div className="sidebar-footer">
            <Link
              href="/sign-out"
              className="nav-link nav-link-signout"
              title={collapsed ? "Sign out" : undefined}
            >
              <strong>Sign out</strong>
            </Link>
          </div>
        </aside>

        <main className="workspace-main">
          {children}
        </main>
      </div>
    </div>
  );
}
