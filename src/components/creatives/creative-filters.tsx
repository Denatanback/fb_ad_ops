import Link from "next/link";
import { creativeLabelOptions, lifecycleStatusOptions } from "@/lib/creative-taxonomy";

type ApproachOption = {
  id: string;
  name: string;
};

type CreativeFiltersProps = {
  approaches: ApproachOption[];
  values: {
    query: string;
    approachId: string;
    status: string;
    label: string;
  };
};

export function CreativeFilters({ approaches, values }: CreativeFiltersProps) {
  return (
    <form action="/creatives" className="compact-filter-form" method="get">
      <label className="field field--compact">
        <span className="field__label">Поиск</span>
        <input
          className="auth-input"
          defaultValue={values.query}
          name="q"
          placeholder="Название, тип или заметка"
          type="search"
        />
      </label>

      <label className="field field--compact">
        <span className="field__label">Подход</span>
        <select className="auth-input" defaultValue={values.approachId} name="approachId">
          <option value="">Все подходы</option>
          {approaches.map((approach) => (
            <option key={approach.id} value={approach.id}>
              {approach.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--compact">
        <span className="field__label">Статус</span>
        <select className="auth-input" defaultValue={values.status} name="status">
          <option value="">Все статусы</option>
          {lifecycleStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--compact">
        <span className="field__label">Метка</span>
        <select className="auth-input" defaultValue={values.label} name="label">
          <option value="">Все метки</option>
          {creativeLabelOptions.map((label) => (
            <option key={label.value} value={label.value}>
              {label.label}
            </option>
          ))}
        </select>
      </label>

      <div className="compact-filter-form__actions">
        <button className="button button--primary button--compact" type="submit">
          Применить
        </button>
        <Link className="button button--secondary button--compact" href="/creatives">
          Сбросить
        </Link>
      </div>
    </form>
  );
}
