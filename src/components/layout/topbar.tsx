"use client";

import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getWorkspaceNavigationItem } from "@/lib/navigation";

const defaultDescription = "Защищённое рабочее пространство команды.";

const roleLabels = {
  admin: "Администратор",
  member: "Участник команды"
} as const;

export function Topbar({ session }: { session: Session }) {
  const pathname = usePathname();
  const currentItem = getWorkspaceNavigationItem(pathname);
  const role = session.user?.role === "admin" ? "admin" : "member";

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <h1>{currentItem?.title ?? "Рабочее пространство"}</h1>
      </div>

      <div className="topbar-actions">
        <div className="user-chip">
          <div className="user-chip__meta">
            <strong>{session.user?.email}</strong>
            <span>{roleLabels[role]}</span>
          </div>
          <span className={`pill ${role === "admin" ? "pill--ready" : "pill--neutral"}`}>{role}</span>
        </div>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
