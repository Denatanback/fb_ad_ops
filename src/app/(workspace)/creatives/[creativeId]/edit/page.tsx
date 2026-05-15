import { notFound } from "next/navigation";
import { CreativeForm } from "@/components/creatives/creative-form";
import { PageHeader } from "@/components/workspace/page-header";
import { updateCreativeAction } from "@/app/(workspace)/creatives/actions";
import { getLifecycleStatusMeta } from "@/lib/creative-taxonomy";
import { getCreativeDetail, getCreativeFormContext } from "@/server/services/creatives";

type EditCreativePageProps = {
  params: {
    creativeId: string;
  };
  searchParams?: {
    error?: string;
  };
};

export default async function EditCreativePage({ params, searchParams }: EditCreativePageProps) {
  const [creative, context] = await Promise.all([getCreativeDetail(params.creativeId), getCreativeFormContext()]);

  if (!creative) {
    notFound();
  }

  const action = updateCreativeAction.bind(null, creative.id);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Редактирование Creative"
        title={`Редактировать: ${creative.name}`}
        description="Поля креатива, статус, метки и медиа."
      />

      <CreativeForm
        action={action}
        approaches={context.approaches}
        cancelHref={`/creatives/${creative.id}`}
        description="Форма использует ту же структуру, что и создание: это помогает команде одинаково работать с внешними ссылками, Drive upload и media metadata без превращения карточки в media library."
        error={searchParams?.error}
        googleDrive={context.googleDrive}
        heading="Редактирование"
        submitLabel="Сохранить изменения"
        values={{
          name: creative.name,
          approachId: creative.approachId ?? "",
          currentStatus: getLifecycleStatusMeta(creative.currentStatus)?.value ?? "queue",
          type: creative.type ?? "",
          assetUrl: creative.assetUrl ?? "",
          previewUrl: creative.previewUrl ?? "",
          sourceUrl: creative.sourceUrl ?? "",
          driveFileId: creative.driveFileId ?? "",
          driveWebViewLink: creative.driveWebViewLink ?? "",
          driveDownloadUrl: creative.driveDownloadUrl ?? "",
          thumbnailUrl: creative.thumbnailUrl ?? "",
          sourceFilename: creative.sourceFilename ?? "",
          sourceMimeType: creative.sourceMimeType ?? "",
          sourceByteSize: creative.sourceByteSize ? String(creative.sourceByteSize) : "",
          notes: creative.notes ?? "",
          labels: creative.labelAssignments.map((assignment) => assignment.creativeLabel.key)
        }}
      />
    </div>
  );
}
