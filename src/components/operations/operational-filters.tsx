import Link from "next/link";
import { creativeLabelOptions } from "@/lib/creative-taxonomy";
import type { OperationalSortValue } from "@/server/services/operations";

type ApproachOption = {
  id: string;
  name: string;
};

const sortOptions: Array<{ value: OperationalSortValue; label: string }> = [
  { value: "recent", label: "Недавно обновлённые" },
  { value: "latest_launch", label: "Свежий запуск сверху" },
  { value: "launches", label: "Больше запусков" },
  { value: "attention", label: "Сначала требующие внимания" },
  { value: "name", label: "По названию" }
];

export function OperationalFilters({
  action,
  approaches,
  values
}: {
  action: string;
  approaches: ApproachOption[];
  values: {
    query: string;
    approachId: string;
    label: string;
    sort: OperationalSortValue;
  };
}) {
  return (
    <form action={action} className="filters-panel" method="get">
      <div className="filters-grid">
        <div className="field">
          <label className="field__label" htmlFor={`${action}-search`}>
            Поиск
          </label>
          <input
            className="auth-input"
            defaultValue={values.query}
            id={`${action}-search`}
            name="q"
            placeholder="Креатив, тип или рабочая заметка"
            type="search"
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${action}-approach`}>
            Approach
          </label>
          <select className="auth-input" defaultValue={values.approachId} id={`${action}-approach`} name="approachId">
            <option value="">Все подходы</option>
            {approaches.map((approach) => (
              <option key={approach.id} value={approach.id}>
                {approach.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${action}-label`}>
            Метка
          </label>
          <select className="auth-input" defaultValue={values.label} id={`${action}-label`} name="label">
            <option value="">Все метки</option>
            {creativeLabelOptions.map((label) => (
              <option key={label.value} value={label.value}>
                {label.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${action}-sort`}>
            Сортировка
          </label>
          <select className="auth-input" defaultValue={values.sort} id={`${action}-sort`} name="sort">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hero-actions">
        <button className="button button--primary" type="submit">
          Применить
        </button>
        <Link className="button button--secondary" href={action}>
          Сбросить
        </Link>
      </div>
    </form>
  );
}
