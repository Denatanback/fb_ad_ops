import { notFound } from "next/navigation";
import { LaunchForm } from "@/components/launches/launch-form";
import { PageHeader } from "@/components/workspace/page-header";
import { createLaunchAction } from "@/app/(workspace)/launches/actions";
import { getLaunchFormContext } from "@/server/services/launches";

type NewLaunchPageProps = {
  params: {
    creativeId: string;
  };
  searchParams?: {
    error?: string;
  };
};

export default async function NewLaunchPage({ params, searchParams }: NewLaunchPageProps) {
  const context = await getLaunchFormContext(params.creativeId);

  if (!context.creative) {
    notFound();
  }

  const action = createLaunchAction.bind(null, context.creative.id);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Новый запуск"
        title={`Создать запуск для ${context.creative.name}`}
        description="Setup, бюджет и начальные метрики."
      />

      <LaunchForm
        action={action}
        cancelHref={`/creatives/${context.creative.id}`}
        creative={context.creative}
        description="Форма объединяет минимально нужные MVP-поля для запуска и текущего snapshot метрик."
        error={searchParams?.error}
        heading="Создание запуска"
        landers={context.landers}
        submitLabel="Создать запуск"
        values={{
          setupName: "",
          landerId: "",
          budgetMode: "adset",
          lifecycleStatus: "queue",
          launchedAt: "",
          stoppedAt: "",
          notes: "",
          metrics: {}
        }}
      />
    </div>
  );
}
