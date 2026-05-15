import { AppShell } from "@/components/layout/app-shell";
import { requireAuthSession } from "@/server/auth/session";

export default async function WorkspaceLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuthSession();

  return <AppShell session={session}>{children}</AppShell>;
}
