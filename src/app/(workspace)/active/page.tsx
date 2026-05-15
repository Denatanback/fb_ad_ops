import { OperationalWorkspaceView } from "@/components/operations/operational-workspace-view";
import { parseCreativeLabelValue } from "@/lib/creative-taxonomy";
import { listApproachOptions } from "@/server/services/approaches";
import { getOperationalViewData, parseOperationalSortValue } from "@/server/services/operations";

type ActivePageProps = {
  searchParams?: {
    q?: string;
    approachId?: string;
    label?: string;
    sort?: string;
  };
};

export default async function ActivePage({ searchParams }: ActivePageProps) {
  const values = {
    query: searchParams?.q?.trim() ?? "",
    approachId: searchParams?.approachId?.trim() ?? "",
    label: searchParams?.label?.trim() ?? "",
    sort: parseOperationalSortValue(searchParams?.sort ?? null) ?? "latest_launch"
  };

  const filters = {
    query: values.query || undefined,
    approachId: values.approachId || undefined,
    label: parseCreativeLabelValue(values.label)?.dbValue,
    sort: values.sort
  };

  const [data, approaches] = await Promise.all([getOperationalViewData("active", filters), listApproachOptions()]);

  return <OperationalWorkspaceView approaches={approaches} data={data} values={values} view="active" />;
}
