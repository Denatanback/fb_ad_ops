import { createLanderAction } from "@/app/(workspace)/landers/actions";

export function LanderCreateForm() {
  return (
    <form action={createLanderAction} className="stack">
      <div className="field">
        <label className="field__label" htmlFor="lander-name">
          Название лендинга
        </label>
        <input className="auth-input" id="lander-name" name="name" placeholder="Например, Past Life LP 1" required type="text" />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="lander-url">
          URL
        </label>
        <input className="auth-input" id="lander-url" name="url" placeholder="https://..." required type="url" />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="lander-notes">
          Заметки
        </label>
        <textarea
          className="auth-input textarea-input"
          id="lander-notes"
          name="notes"
          placeholder="Короткий контекст по лендингу."
          rows={4}
        />
      </div>

      <button className="button button--primary" type="submit">
        Добавить лендинг
      </button>
    </form>
  );
}
