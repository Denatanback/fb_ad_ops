"use client";

import { useState } from "react";
import type { HierarchyCampaignRow, HierarchyAdSetRow, HierarchyAdRow } from "@/server/services/campaign-hierarchy";

function fmt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function fmtInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function fmtDelta(value: number): string {
  if (!value) return "—";
  return `+${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value)}`;
}

function DeliveryPill({ delivery }: { delivery: string | null }) {
  if (!delivery) return null;
  const d = delivery.toLowerCase();
  const cls = d === "active" ? "pill--ready" : d.includes("learn") ? "pill--pending" : "pill--neutral";
  return <span className={`pill ${cls}`} style={{ fontSize: "0.72rem" }}>{delivery}</span>;
}

type AdRowProps = { ad: HierarchyAdRow };
function AdRowComp({ ad }: AdRowProps) {
  return (
    <tr className="hierarchy-row hierarchy-row--ad">
      <td>
        <div className="hierarchy-indent hierarchy-indent--2">
          <span className="hierarchy-name">{ad.adName || "—"}</span>
          <DeliveryPill delivery={ad.delivery} />
        </div>
      </td>
      <td>{fmt(ad.spend)}</td>
      <td>{ad.results || "—"}</td>
      <td>{fmt(ad.cpa)}</td>
      <td>{fmtInt(ad.clicks)}</td>
      <td>{fmt(ad.cpc)}</td>
      <td>{fmtPct(ad.ctr)}</td>
      <td>{fmtPct(ad.outboundCtr)}</td>
      <td>{fmt(ad.cpm)}</td>
      <td>{fmt(ad.cplpv)}</td>
      <td>{fmtInt(ad.lpv)}</td>
      <td className="hierarchy-delta">{fmtDelta(ad.intervalSpend)}</td>
    </tr>
  );
}

type AdSetRowProps = { adSet: HierarchyAdSetRow; openAdSets: Set<string>; onToggle: (key: string) => void };
function AdSetRowComp({ adSet, openAdSets, onToggle }: AdSetRowProps) {
  const key = adSet.adSetId ?? adSet.adSetName;
  const open = openAdSets.has(key);
  const hasAds = adSet.ads.length > 0;

  return (
    <>
      <tr className="hierarchy-row hierarchy-row--adset">
        <td>
          <div className="hierarchy-indent hierarchy-indent--1">
            {hasAds ? (
              <button className="hierarchy-expand" onClick={() => onToggle(key)} aria-label={open ? "Свернуть" : "Развернуть"}>
                {open ? "▼" : "▶"}
              </button>
            ) : (
              <span className="hierarchy-expand hierarchy-expand--placeholder" />
            )}
            <span className="hierarchy-name">{adSet.adSetName || "—"}</span>
            <DeliveryPill delivery={adSet.delivery} />
          </div>
        </td>
        <td>{fmt(adSet.spend)}</td>
        <td>{adSet.results || "—"}</td>
        <td>{fmt(adSet.cpa)}</td>
        <td>{fmtInt(adSet.clicks)}</td>
        <td>{fmt(adSet.cpc)}</td>
        <td>{fmtPct(adSet.ctr)}</td>
        <td>{fmtPct(adSet.outboundCtr)}</td>
        <td>{fmt(adSet.cpm)}</td>
        <td>{fmt(adSet.cplpv)}</td>
        <td>{fmtInt(adSet.lpv)}</td>
        <td className="hierarchy-delta">{fmtDelta(adSet.intervalSpend)}</td>
      </tr>
      {open && adSet.ads.map((ad, i) => <AdRowComp key={ad.adId ?? i} ad={ad} />)}
    </>
  );
}

type CampaignRowProps = {
  campaign: HierarchyCampaignRow;
  openCampaigns: Set<string>;
  openAdSets: Set<string>;
  onToggleCampaign: (key: string) => void;
  onToggleAdSet: (key: string) => void;
};

function CampaignRowComp({ campaign, openCampaigns, openAdSets, onToggleCampaign, onToggleAdSet }: CampaignRowProps) {
  const key = campaign.campaignId ?? campaign.campaignName;
  const open = openCampaigns.has(key);
  const hasAdSets = campaign.adSets.length > 0;

  return (
    <>
      <tr className="hierarchy-row hierarchy-row--campaign">
        <td>
          <div className="hierarchy-indent hierarchy-indent--0">
            {hasAdSets ? (
              <button className="hierarchy-expand" onClick={() => onToggleCampaign(key)} aria-label={open ? "Свернуть" : "Развернуть"}>
                {open ? "▼" : "▶"}
              </button>
            ) : (
              <span className="hierarchy-expand hierarchy-expand--placeholder" />
            )}
            <div className="hierarchy-name-block">
              <span className="hierarchy-name">{campaign.campaignName}</span>
              {campaign.approachName ? <span className="hierarchy-sub">{campaign.approachName}</span> : null}
            </div>
            <DeliveryPill delivery={campaign.delivery} />
          </div>
        </td>
        <td><strong>{fmt(campaign.spend)}</strong></td>
        <td><strong>{campaign.results || "—"}</strong></td>
        <td><strong>{fmt(campaign.cpa)}</strong></td>
        <td>{fmtInt(campaign.clicks)}</td>
        <td>{fmt(campaign.cpc)}</td>
        <td>{fmtPct(campaign.ctr)}</td>
        <td>{fmtPct(campaign.outboundCtr)}</td>
        <td>{fmt(campaign.cpm)}</td>
        <td>{fmt(campaign.cplpv)}</td>
        <td>{fmtInt(campaign.lpv)}</td>
        <td className="hierarchy-delta">{fmtDelta(campaign.intervalSpend)}</td>
      </tr>
      {open && campaign.adSets.map((adSet, i) => (
        <AdSetRowComp
          key={adSet.adSetId ?? i}
          adSet={adSet}
          openAdSets={openAdSets}
          onToggle={onToggleAdSet}
        />
      ))}
    </>
  );
}

type Props = { campaigns: HierarchyCampaignRow[] };

export function CampaignHierarchyTable({ campaigns }: Props) {
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());
  const [openAdSets, setOpenAdSets] = useState<Set<string>>(new Set());

  function toggleCampaign(key: string) {
    setOpenCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleAdSet(key: string) {
    setOpenAdSets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <div className="table-shell">
      <table className="data-table hierarchy-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Spend</th>
            <th>Results</th>
            <th>CPA</th>
            <th>Clicks</th>
            <th>CPC</th>
            <th>CTR</th>
            <th>Outbound CTR</th>
            <th>CPM</th>
            <th>CPLPV</th>
            <th>LPV</th>
            <th>Δ Spend</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign, i) => (
            <CampaignRowComp
              key={campaign.campaignId ?? i}
              campaign={campaign}
              openCampaigns={openCampaigns}
              openAdSets={openAdSets}
              onToggleCampaign={toggleCampaign}
              onToggleAdSet={toggleAdSet}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
