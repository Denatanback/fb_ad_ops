import Link from "next/link";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { requireRole } from "@/server/auth/session";
import { getGoogleDriveAdminStatus, listDriveFolders } from "@/server/integrations/google-drive/service";
import { DriveFolderManager } from "./folder-manager";

export default async function GoogleDriveFoldersPage() {
  await requireRole("admin");

  const [status, folders] = await Promise.all([
    getGoogleDriveAdminStatus(),
    getGoogleDriveAdminStatus().then(async (s) => {
      if (!s.connected) return [];
      return listDriveFolders().catch(() => []);
    })
  ]);

  const isConnected = status.connected;

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Google Drive"
        title="Управление папками"
        description="Создавайте папки в Google Drive и организовывайте загрузку креативов по структуре."
      />

      <SettingsSectionNav activeHref="/admin/google-drive" isAdmin />

      {!isConnected ? (
        <SectionCard title="Google Drive не подключён">
          <div className="empty-inline">
            <h3>Сначала подключите Google Drive</h3>
            <p>Управление папками доступно только после настройки интеграции.</p>
            <div className="hero-actions">
              <Link className="button button--primary" href="/admin/google-drive">
                Настроить интеграцию
              </Link>
            </div>
          </div>
        </SectionCard>
      ) : (
        <DriveFolderManager initialFolders={folders} rootFolderId={status.integration?.driveFolderId ?? null} />
      )}
    </div>
  );
}
