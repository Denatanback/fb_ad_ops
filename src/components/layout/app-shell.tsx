import type { Session } from "next-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({
  session,
  children
}: Readonly<{
  session: Session;
  children: React.ReactNode;
}>) {
  const userRole = session.user?.role === "admin" ? "admin" : "member";

  return (
    <div className="workspace-shell">
      <Sidebar userRole={userRole} />
      <div className="content-shell">
        <Topbar session={session} />
        <main className="content-shell__body">{children}</main>
      </div>
    </div>
  );
}
