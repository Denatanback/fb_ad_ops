import { requireRole } from "@/server/auth/session";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout will automatically reject non-ADMIN users
  // and redirect them to /unauthorized or similar
  await requireRole("admin");

  return <>{children}</>;
}
