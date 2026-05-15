import { BulkCreativeUploadForm } from "@/components/creatives/bulk-creative-upload-form";
import { PageHeader } from "@/components/workspace/page-header";
import { getCreativeBulkUploadContext } from "@/server/services/creatives";

export default async function BulkCreativeUploadPage() {
  const context = await getCreativeBulkUploadContext();

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Bulk creatives"
        title="Массовая загрузка креативов"
        description="Загрузка нескольких файлов в Google Drive с автоопределением типа."
      />

      <BulkCreativeUploadForm approaches={context.approaches} googleDrive={context.googleDrive} driveFolders={context.driveFolders} />
    </div>
  );
}
