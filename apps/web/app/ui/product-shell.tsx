import type { ReactNode } from "react";
import Link from "next/link";
import { appNavigation, workspaceSignals } from "./scaffold-data";

type ProductShellProps = {
  activePath: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function ProductShell({
  activePath,
  eyebrow,
  title,
  description,
  actions,
  children,
}: ProductShellProps) {
  return (
    <div className="workspace-page">
      <div className="workspace-shell ritmio-shell">
        <aside className="workspace-sidebar ritmio-card">
          <div className="brand-block">
            <Link href="/" className="brand-mark">
              Ritmio
            </Link>
            <p>
              Desktop workspace scaffold for weekly social planning, approvals,
              media analysis, and account operations.
            </p>
          </div>

          <nav className="sidebar-nav" aria-label="Product navigation">
            {appNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${
                  activePath === item.href ? "nav-link-active" : ""
                }`}
              >
                <strong>{item.label}</strong>
                <span>{item.blurb}</span>
              </Link>
            ))}
          </nav>

          <div className="sidebar-panel">
            <p className="ritmio-eyebrow">This sprint</p>
            <h2>Desktop-first planning flow</h2>
            <p>
              Refine the core web experience first, then adapt the strongest
              interactions into native mobile later.
            </p>
          </div>

          <div className="sidebar-stack">
            {workspaceSignals.map((signal) => (
              <div key={signal.label} className="signal-card">
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <p>{signal.note}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="workspace-main">
          <header className="page-header">
            <div>
              <p className="ritmio-eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            {actions ? <div className="page-actions">{actions}</div> : null}
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
