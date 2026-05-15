import { CreativeForm } from "@/components/creatives/creative-form";
import { PageHeader } from "@/components/workspace/page-header";
import { createCreativeAction } from "@/app/(workspace)/creatives/actions";
import { getCreativeFormContext } from "@/server/services/creatives";

type NewCreativePageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function NewCreativePage({ searchParams }: NewCreativePageProps) {
  const context = await getCreativeFormContext();

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Новый Creative"
        title="Создать креатив"
        description="Подход, статус, метки и медиа."
      />

      <CreativeForm
        action={createCreativeAction}
        approaches={context.approaches}
        cancelHref="/creatives"
        description="Launch-данные здесь не добавляются специально: креатив и будущие запуски остаются разными сущностями. Медиа-блок отвечает за внешние ссылки, Drive-backed originals и preview-first references."
        error={searchParams?.error}
        googleDrive={context.googleDrive}
        heading="Новый креатив"
        submitLabel="Создать креатив"
        values={{
          name: "",
          approachId: "",
          currentStatus: "queue",
          type: "",
          assetUrl: "",
          previewUrl: "",
          sourceUrl: "",
          driveFileId: "",
          driveWebViewLink: "",
          driveDownloadUrl: "",
          thumbnailUrl: "",
          sourceFilename: "",
          sourceMimeType: "",
          sourceByteSize: "",
          notes: "",
          labels: []
        }}
      />
    </div>
  );
}
