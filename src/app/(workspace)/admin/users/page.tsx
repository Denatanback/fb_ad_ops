import { PageHeader } from "@/components/workspace/page-header";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { db } from "@/server/db/client";
import { requireRole } from "@/server/auth/session";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const session = await requireRole("admin");

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  });

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Админ-панель"
        title="Пользователи"
        description="Добавление пользователей, смена ролей и управление доступом к внутренней системе."
      />

      <SettingsSectionNav activeHref="/admin/users" isAdmin />

      <section className="panel">
        <div className="panel-content">
          <UsersClient currentUserId={session.user.id} users={users} />
        </div>
      </section>
    </div>
  );
}
