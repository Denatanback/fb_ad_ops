const rules = [
  "Same Meta columns preset for Campaign, Ad Set, and Ad exports",
  "Each row must represent one reporting day",
  "Reporting starts / ends are required",
  "reportDate is read from Reporting starts",
  "Same cabinet + day + level replaces previous import",
];

const presetColumns = [
  "Delivery",
  "Results",
  "Cost per result",
  "Amount spent",
  "CPM",
  "Frequency",
  "Reach",
  "Impressions",
  "Clicks (all)",
  "CPC (all)",
  "CTR (all)",
  "Link clicks",
  "CTR link",
  "CPC link",
  "Outbound clicks",
  "Outbound CTR",
  "Cost per outbound click",
  "Landing page views",
  "Cost per landing page view",
  "Reporting starts / Reporting ends",
  "Budget",
  "Entity IDs/names",
];

const entityNotes = [
  "Campaign: Campaign ID/name",
  "Ad Set: Campaign ID/name + Ad set ID/name",
  "Ad: Campaign ID/name + Ad set ID/name + Ad ID/name",
];

export function CsvHintCard() {
  return (
    <aside className="csv-hint-card">
      <div className="csv-hint-card__header">
        <p className="csv-hint-card__title">CSV requirements</p>
        <span className="csv-hint-card__badge">Common preset</span>
      </div>

      <div className="csv-hint-card__rules">
        {rules.map((rule) => (
          <span className="csv-hint-card__rule" key={rule}>
            {rule}
          </span>
        ))}
      </div>

      <div className="csv-hint-card__group">
        <p className="csv-hint-card__level">Expected columns</p>
        <div className="csv-hint-card__chips">
          {presetColumns.map((field) => (
            <span className="csv-hint-card__chip" key={field}>
              {field}
            </span>
          ))}
        </div>
      </div>

      <div className="csv-hint-card__group">
        <p className="csv-hint-card__level">Entity fields</p>
        <ul className="csv-hint-card__notes">
          {entityNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
