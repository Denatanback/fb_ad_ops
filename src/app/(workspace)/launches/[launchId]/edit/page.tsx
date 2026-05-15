import { notFound } from "next/navigation";
import { LaunchForm } from "@/components/launches/launch-form";
import { PageHeader } from "@/components/workspace/page-header";
import { updateLaunchAction } from "@/app/(workspace)/launches/actions";
import { formatNumericValue, toDateInputValue } from "@/lib/formatters";
import { getBudgetModeMeta } from "@/lib/launch-taxonomy";
import { getLaunchDetail, getLaunchFormContext } from "@/server/services/launches";

type EditLaunchPageProps = {
  params: {
    launchId: string;
  };
  searchParams?: {
    error?: string;
  };
};

export default async function EditLaunchPage({ params, searchParams }: EditLaunchPageProps) {
  const launch = await getLaunchDetail(params.launchId);

  if (!launch) {
    notFound();
  }

  const context = await getLaunchFormContext(launch.creative.id);

  if (!context.creative) {
    notFound();
  }

  const metrics = launch.metrics[0] ?? null;
  const action = updateLaunchAction.bind(null, launch.id);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Редактирование запуска"
        title={`Редактировать: ${launch.setupName}`}
        description="Setup, бюджет и текущие метрики."
      />

      <LaunchForm
        action={action}
        cancelHref={`/launches/${launch.id}`}
        creative={context.creative}
        description="Эта форма остаётся компактной и практичной: только поля MVP, нужные для ручного управления запуском."
        error={searchParams?.error}
        heading="Редактирование запуска"
        landers={context.landers}
        submitLabel="Сохранить запуск"
        values={{
          setupName: launch.setupName,
          landerId: launch.landerId ?? "",
          budgetMode: getBudgetModeMeta(launch.budgetMode)?.value ?? "adset",
          lifecycleStatus: launch.lifecycleStatus.toLowerCase(),
          launchedAt: toDateInputValue(launch.launchedAt),
          stoppedAt: toDateInputValue(launch.stoppedAt),
          notes: launch.notes ?? "",
          metrics: {
            cpc: formatNumericValue(metrics?.cpc, ""),
            ctr: formatNumericValue(metrics?.ctr, ""),
            cplpv: formatNumericValue(metrics?.cplpv, ""),
            outboundCtr: formatNumericValue(metrics?.outboundCtr, ""),
            cpm: formatNumericValue(metrics?.cpm, ""),
            clicks: formatNumericValue(metrics?.clicks, ""),
            cr: formatNumericValue(metrics?.cr, ""),
            results: formatNumericValue(metrics?.results, ""),
            costPerResult: formatNumericValue(metrics?.costPerResult, "")
          }
        }}
      />
    </div>
  );
}
