"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getWorkspaceNavigationSectionsForRole, isWorkspaceNavigationActive } from "@/lib/navigation";

const roleLabels = {
  admin: "Админ",
  member: "Участник"
} as const;

export function Sidebar({ userRole }: { userRole: "admin" | "member" }) {
  const pathname = usePathname();
  const sections = getWorkspaceNavigationSectionsForRole(userRole);

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark">FB</div>
        <div className="brand-copy">
          <span className="brand-title">FB Ads Ops</span>
          <span className="brand-subtitle">Внутренний workspace</span>
        </div>
      </div>

      <div className="sidebar__nav">
        {sections.map((section) => (
          <nav aria-label={section.label} className="nav-group" key={section.id}>
            <span className="nav-label">{section.label}</span>
            <div className="nav-stack">
              {section.items.map((item) => {
                const isActive = isWorkspaceNavigationActive(pathname, item.href);

                return (
                  <Link
                    className={`nav-item nav-item--minimal nav-item--link ${isActive ? "nav-item--active" : ""}`}
                    href={item.href}
                    key={item.href}
                    title={item.description}
                  >
                    <span className="nav-title">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        ))}
      </div>

      <div className="sidebar-footer">
        <strong>{roleLabels[userRole]}</strong>
      </div>
    </aside>
  );
}
