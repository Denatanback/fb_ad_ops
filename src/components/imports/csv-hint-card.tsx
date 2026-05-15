// Pure server component — no interactivity needed

type FieldGroup = {
  level: string;
  fields: string[];
};

const fieldGroups: FieldGroup[] = [
  {
    level: "Campaign",
    fields: [
      "Campaign name",
      "Reporting starts / ends",
      "Amount spent (USD)",
      "Results",
      "Cost per results",
      "Reach",
      "Impressions",
      "Clicks (all)",
      "CTR (link click-through rate)",
      "Outbound CTR (click-through rate)",
      "CPM (cost per 1,000 impressions) (USD)",
      "CPC (all) (USD)",
      "Campaign delivery",
    ],
  },
  {
    level: "Ad set",
    fields: [
      "Campaign name",
      "Ad set name",
      "Reporting starts / ends",
      "Amount spent (USD)",
      "Results",
      "Cost per results",
      "Reach",
      "Impressions",
      "Clicks (all)",
      "CTR (link click-through rate)",
      "Outbound CTR (click-through rate)",
      "CPM (cost per 1,000 impressions) (USD)",
      "CPC (all) (USD)",
      "Ad set delivery",
      "Ad set budget",
    ],
  },
  {
    level: "Ad",
    fields: [
      "Campaign name",
      "Ad set name",
      "Ad name",
      "Reporting starts / ends",
      "Amount spent (USD)",
      "Results",
      "Cost per results",
      "Reach",
      "Impressions",
      "Clicks (all)",
      "CTR (link click-through rate)",
      "Outbound CTR (click-through rate)",
      "CPM (cost per 1,000 impressions) (USD)",
      "CPC (all) (USD)",
      "Ad delivery",
    ],
  },
];

const rules = [
  "1 day per file",
  "Date read from CSV",
  "Same cabinet + day + level → replaces previous",
  "Select cabinet before upload",
];

export function CsvHintCard() {
  return (
    <aside className="csv-hint-card">
      <p className="csv-hint-card__title">CSV requirements</p>

      <div className="csv-hint-card__rules">
        {rules.map((rule) => (
          <span className="csv-hint-card__rule" key={rule}>
            {rule}
          </span>
        ))}
      </div>

      <div className="csv-hint-card__groups">
        {fieldGroups.map((group) => (
          <div className="csv-hint-card__group" key={group.level}>
            <p className="csv-hint-card__level">{group.level}</p>
            <ul className="csv-hint-card__fields">
              {group.fields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
