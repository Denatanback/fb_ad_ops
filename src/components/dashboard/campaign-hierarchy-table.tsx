"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HierarchyAdRow,
  HierarchyAdSetRow,
  HierarchyCampaignRow,
} from "@/server/services/campaign-hierarchy";

type HierarchyRow = HierarchyCampaignRow | HierarchyAdSetRow | HierarchyAdRow;

type MetricColumnKey =
  | "delivery"
  | "results"
  | "costPerResult"
  | "spend"
  | "cpm"
  | "clicksAll"
  | "cpcAll"
  | "ctrAll"
  | "impressions"
  | "reach"
  | "frequency"
  | "linkClicks"
  | "linkCtr"
  | "linkCpc"
  | "outboundClicks"
  | "outboundCtr"
  | "costPerOutboundClick"
  | "landingPageViews"
  | "costPerLandingPageView"
  | "budget";

type MetricColumn = {
  key: MetricColumnKey;
  label: string;
  shortLabel?: string;
  render: (row: HierarchyRow) => React.ReactNode;
};

const columnsStorageKey = "fb_ads_ops.dashboard.campaign_hierarchy.columns.v1";

const defaultColumnKeys: MetricColumnKey[] = [
  "delivery",
  "results",
  "costPerResult",
  "spend",
  "cpm",
  "clicksAll",
  "cpcAll",
  "ctrAll",
  "impressions",
  "reach",
];

function fmtMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function fmtInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function fmtDecimal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function fmtBudget(value: HierarchyRow["budget"]): string {
  if (value === "mixed") return "mixed";
  return fmtMoney(value);
}

function DeliveryPill({ delivery }: { delivery: string | null }) {
  if (!delivery) return <span className="table-empty">—</span>;
  const normalized = delivery.toLowerCase();
  const cls =
    normalized === "active"
      ? "pill--ready"
      : normalized.includes("learn")
        ? "pill--pending"
        : "pill--neutral";

  return (
    <span className={`pill ${cls}`} style={{ fontSize: "0.72rem" }}>
      {delivery}
    </span>
  );
}

const metricColumns: MetricColumn[] = [
  {
    key: "delivery",
    label: "Delivery",
    render: (row) => <DeliveryPill delivery={row.delivery} />,
  },
  {
    key: "results",
    label: "Results",
    render: (row) => fmtInt(row.results),
  },
  {
    key: "costPerResult",
    label: "Cost per result",
    shortLabel: "Cost / result",
    render: (row) => fmtMoney(row.costPerResult),
  },
  {
    key: "spend",
    label: "Amount spent",
    shortLabel: "Spend",
    render: (row) => fmtMoney(row.spend),
  },
  {
    key: "cpm",
    label: "CPM (cost per 1,000 impressions)",
    shortLabel: "CPM",
    render: (row) => fmtMoney(row.cpm),
  },
  {
    key: "clicksAll",
    label: "Clicks (all)",
    render: (row) => fmtInt(row.clicksAll),
  },
  {
    key: "cpcAll",
    label: "CPC (all)",
    render: (row) => fmtMoney(row.cpcAll),
  },
  {
    key: "ctrAll",
    label: "CTR (all)",
    render: (row) => fmtPct(row.ctrAll),
  },
  {
    key: "impressions",
    label: "Impressions",
    render: (row) => fmtInt(row.impressions),
  },
  {
    key: "reach",
    label: "Reach",
    render: (row) => fmtInt(row.reach),
  },
  {
    key: "frequency",
    label: "Frequency",
    render: (row) => fmtDecimal(row.frequency),
  },
  {
    key: "linkClicks",
    label: "Link clicks",
    render: (row) => fmtInt(row.linkClicks),
  },
  {
    key: "linkCtr",
    label: "CTR (link click-through rate)",
    shortLabel: "Link CTR",
    render: (row) => fmtPct(row.linkCtr),
  },
  {
    key: "linkCpc",
    label: "CPC (cost per link click)",
    shortLabel: "Link CPC",
    render: (row) => fmtMoney(row.linkCpc),
  },
  {
    key: "outboundClicks",
    label: "Outbound clicks",
    render: (row) => fmtInt(row.outboundClicks),
  },
  {
    key: "outboundCtr",
    label: "Outbound CTR (click-through rate)",
    shortLabel: "Outbound CTR",
    render: (row) => fmtPct(row.outboundCtr),
  },
  {
    key: "costPerOutboundClick",
    label: "Cost per outbound click",
    render: (row) => fmtMoney(row.costPerOutboundClick),
  },
  {
    key: "landingPageViews",
    label: "Landing page views",
    shortLabel: "LP views",
    render: (row) => fmtInt(row.landingPageViews),
  },
  {
    key: "costPerLandingPageView",
    label: "Cost per landing page view",
    shortLabel: "CPLPV",
    render: (row) => fmtMoney(row.costPerLandingPageView),
  },
  {
    key: "budget",
    label: "Budget",
    render: (row) => fmtBudget(row.budget),
  },
];

const metricColumnByKey = new Map(metricColumns.map((column) => [column.key, column]));
const validColumnKeys = new Set(metricColumns.map((column) => column.key));

function normalizeStoredColumnKeys(value: unknown): MetricColumnKey[] | null {
  if (!Array.isArray(value)) return null;

  const keys = value.filter(
    (key): key is MetricColumnKey => typeof key === "string" && validColumnKeys.has(key as MetricColumnKey)
  );
  const deduped = [...new Set(keys)];

  return deduped.length ? deduped : null;
}

function getRowName(row: HierarchyRow): string {
  if ("campaignName" in row) return row.campaignName || "—";
  if ("adSetName" in row) return row.adSetName || "—";
  return row.adName || "—";
}

function MetricCell({ column, row, strong = false }: { column: MetricColumn; row: HierarchyRow; strong?: boolean }) {
  const value = column.render(row);
  return <td>{strong ? <strong>{value}</strong> : value}</td>;
}

type AdRowProps = {
  ad: HierarchyAdRow;
  columns: MetricColumn[];
};

function AdRowComp({ ad, columns }: AdRowProps) {
  return (
    <tr className="hierarchy-row hierarchy-row--ad">
      <td>
        <div className="hierarchy-indent hierarchy-indent--2">
          <span className="hierarchy-name">{getRowName(ad)}</span>
        </div>
      </td>
      {columns.map((column) => (
        <MetricCell column={column} key={column.key} row={ad} />
      ))}
    </tr>
  );
}

type AdSetRowProps = {
  adSet: HierarchyAdSetRow;
  columns: MetricColumn[];
  openAdSets: Set<string>;
  onToggle: (key: string) => void;
};

function AdSetRowComp({ adSet, columns, openAdSets, onToggle }: AdSetRowProps) {
  const key = adSet.adSetId ?? adSet.adSetName;
  const open = openAdSets.has(key);
  const hasAds = adSet.ads.length > 0;

  return (
    <>
      <tr className="hierarchy-row hierarchy-row--adset">
        <td>
          <div className="hierarchy-indent hierarchy-indent--1">
            {hasAds ? (
              <button
                aria-label={open ? "Collapse" : "Expand"}
                className="hierarchy-expand"
                onClick={() => onToggle(key)}
                type="button"
              >
                {open ? "▾" : "▸"}
              </button>
            ) : (
              <span className="hierarchy-expand hierarchy-expand--placeholder" />
            )}
            <span className="hierarchy-name">{getRowName(adSet)}</span>
          </div>
        </td>
        {columns.map((column) => (
          <MetricCell column={column} key={column.key} row={adSet} />
        ))}
      </tr>
      {open &&
        adSet.ads.map((ad, index) => (
          <AdRowComp ad={ad} columns={columns} key={ad.adId ?? `${ad.adName}-${index}`} />
        ))}
    </>
  );
}

type CampaignRowProps = {
  campaign: HierarchyCampaignRow;
  columns: MetricColumn[];
  openCampaigns: Set<string>;
  openAdSets: Set<string>;
  onToggleCampaign: (key: string) => void;
  onToggleAdSet: (key: string) => void;
};

function CampaignRowComp({
  campaign,
  columns,
  openCampaigns,
  openAdSets,
  onToggleCampaign,
  onToggleAdSet,
}: CampaignRowProps) {
  const key = campaign.campaignId ?? campaign.campaignName;
  const open = openCampaigns.has(key);
  const hasAdSets = campaign.adSets.length > 0;

  return (
    <>
      <tr className="hierarchy-row hierarchy-row--campaign">
        <td>
          <div className="hierarchy-indent hierarchy-indent--0">
            {hasAdSets ? (
              <button
                aria-label={open ? "Collapse" : "Expand"}
                className="hierarchy-expand"
                onClick={() => onToggleCampaign(key)}
                type="button"
              >
                {open ? "▾" : "▸"}
              </button>
            ) : (
              <span className="hierarchy-expand hierarchy-expand--placeholder" />
            )}
            <div className="hierarchy-name-block">
              <span className="hierarchy-name">{getRowName(campaign)}</span>
              {campaign.approachName ? <span className="hierarchy-sub">{campaign.approachName}</span> : null}
            </div>
          </div>
        </td>
        {columns.map((column) => (
          <MetricCell column={column} key={column.key} row={campaign} strong />
        ))}
      </tr>
      {open &&
        campaign.adSets.map((adSet, index) => (
          <AdSetRowComp
            adSet={adSet}
            columns={columns}
            key={adSet.adSetId ?? `${adSet.adSetName}-${index}`}
            onToggle={onToggleAdSet}
            openAdSets={openAdSets}
          />
        ))}
    </>
  );
}

type ColumnSelectorProps = {
  selectedKeys: MetricColumnKey[];
  onChange: (keys: MetricColumnKey[]) => void;
  onReset: () => void;
};

function ColumnSelector({ selectedKeys, onChange, onReset }: ColumnSelectorProps) {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  function toggleColumn(key: MetricColumnKey) {
    if (selectedSet.has(key)) {
      onChange(selectedKeys.filter((selectedKey) => selectedKey !== key));
      return;
    }

    onChange([...selectedKeys, key]);
  }

  return (
    <details className="column-selector">
      <summary className="button button--secondary button--compact column-selector__trigger">
        Columns
        <span className="column-selector__count">{selectedKeys.length}</span>
      </summary>
      <div className="column-selector__menu">
        <div className="column-selector__header">
          <span>Visible metrics</span>
          <button className="column-selector__reset" onClick={onReset} type="button">
            Reset
          </button>
        </div>
        <div className="column-selector__options">
          {metricColumns.map((column) => (
            <label className="column-selector__option" key={column.key}>
              <input
                checked={selectedSet.has(column.key)}
                onChange={() => toggleColumn(column.key)}
                type="checkbox"
              />
              <span>{column.shortLabel ?? column.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

type Props = {
  campaigns: HierarchyCampaignRow[];
};

export function CampaignHierarchyTable({ campaigns }: Props) {
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());
  const [openAdSets, setOpenAdSets] = useState<Set<string>>(new Set());
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<MetricColumnKey[]>(defaultColumnKeys);
  const [hasLoadedStoredColumns, setHasLoadedStoredColumns] = useState(false);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(columnsStorageKey);
      if (rawValue) {
        const storedValue = normalizeStoredColumnKeys(JSON.parse(rawValue));
        if (storedValue) setSelectedColumnKeys(storedValue);
      }
    } catch {
      // Ignore malformed or inaccessible storage and use defaults.
    } finally {
      setHasLoadedStoredColumns(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredColumns) return;

    try {
      window.localStorage.setItem(columnsStorageKey, JSON.stringify(selectedColumnKeys));
    } catch {
      // The table should keep working when storage is unavailable.
    }
  }, [hasLoadedStoredColumns, selectedColumnKeys]);

  const visibleColumns = useMemo(
    () =>
      selectedColumnKeys
        .map((key) => metricColumnByKey.get(key))
        .filter((column): column is MetricColumn => Boolean(column)),
    [selectedColumnKeys]
  );

  function toggleCampaign(key: string) {
    setOpenCampaigns((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAdSet(key: string) {
    setOpenAdSets((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resetColumns() {
    setSelectedColumnKeys(defaultColumnKeys);
  }

  return (
    <div className="hierarchy-table-wrap">
      <div className="hierarchy-table-toolbar">
        <span className="hierarchy-table-toolbar__meta">
          {visibleColumns.length} metrics visible
        </span>
        <ColumnSelector
          onChange={setSelectedColumnKeys}
          onReset={resetColumns}
          selectedKeys={selectedColumnKeys}
        />
      </div>

      <div className="table-shell">
        <table className="data-table hierarchy-table">
          <thead>
            <tr>
              <th>Name</th>
              {visibleColumns.map((column) => (
                <th key={column.key}>{column.shortLabel ?? column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign, index) => (
              <CampaignRowComp
                campaign={campaign}
                columns={visibleColumns}
                key={campaign.campaignId ?? `${campaign.campaignName}-${index}`}
                onToggleAdSet={toggleAdSet}
                onToggleCampaign={toggleCampaign}
                openAdSets={openAdSets}
                openCampaigns={openCampaigns}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
