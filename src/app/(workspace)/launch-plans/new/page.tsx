import Link from "next/link";
import { LaunchPlanForm } from "@/components/launch-plans/launch-plan-form";
import { PageHeader } from "@/components/workspace/page-header";
import { listApproachOptions } from "@/server/services/approaches";
import { listCreativesForGallery } from "@/server/services/creatives";
import { createLaunchPlanAction } from "../actions";

type NewLaunchPlanPageProps = {
  searchParams?: {
    error?: string;
    approachId?: string | string[];
    namingLabel?: string | string[];
    creativeId?: string | string[];
  };
};

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readMultiValue(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export default async function NewLaunchPlanPage({ searchParams }: NewLaunchPlanPageProps) {
  const [approaches, creatives] = await Promise.all([listApproachOptions(), listCreativesForGallery({})]);

  return (
    <div className="content-frame">
      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group">
            <Link className="toolbar-link" href="/launch-plans">
              К списку планов
            </Link>
            <Link className="toolbar-link" href="/approaches">
              К воронкам
            </Link>
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow="Новый план"
        title="План запусков"
        description="Выберите креативы из галереи, задайте бюджет и структуру, а система подготовит нейминги для кампании, адсета и креатива."
      />

      <LaunchPlanForm
        action={createLaunchPlanAction}
        approaches={approaches}
        cancelHref="/launch-plans"
        creatives={creatives}
        description="Если вы пришли из воронки, креативы уже предвыбраны. При необходимости можно скорректировать набор прямо здесь."
        error={searchParams?.error}
        heading="Параметры нового плана"
        submitLabel="Сформировать план"
        values={{
          name: "",
          budgetMode: "campaign",
          budget: "50",
          campaignsCount: "1",
          adsetsCount: "3",
          creativesCount: "1",
          approachId: readSingleValue(searchParams?.approachId),
          namingLabel: readSingleValue(searchParams?.namingLabel),
          selectedCreativeIds: readMultiValue(searchParams?.creativeId)
        }}
      />
    </div>
  );
}
