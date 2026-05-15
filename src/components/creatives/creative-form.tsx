import Link from "next/link";
import type { CreativeLabelKey } from "@prisma/client";
import { creativeLabelOptions, lifecycleStatusOptions, type LifecycleStatusValue } from "@/lib/creative-taxonomy";

type ApproachOption = {
  id: string;
  name: string;
};

type GoogleDriveFormStatus = {
  connected: boolean;
  oauthConfigured: boolean;
  folderConfigured: boolean;
  accountEmail: string | null;
  accountName: string | null;
  folderId: string | null;
  folderName: string | null;
  lastErrorMessage: string | null;
};

type CreativeFormValues = {
  name: string;
  approachId: string;
  currentStatus: LifecycleStatusValue;
  type: string;
  assetUrl: string;
  previewUrl: string;
  sourceUrl: string;
  driveFileId: string;
  driveWebViewLink: string;
  driveDownloadUrl: string;
  thumbnailUrl: string;
  sourceFilename: string;
  sourceMimeType: string;
  sourceByteSize: string;
  notes: string;
  labels: CreativeLabelKey[];
};

type CreativeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  approaches: ApproachOption[];
  error?: string;
  heading: string;
  description: string;
  submitLabel: string;
  cancelHref: string;
  values: CreativeFormValues;
  googleDrive: GoogleDriveFormStatus;
};

function renderGoogleDriveStatus(googleDrive: GoogleDriveFormStatus) {
  if (googleDrive.connected) {
    return (
      <div className="flash-message flash-message--success">
        Google Drive подключён
        {googleDrive.accountEmail ? `: ${googleDrive.accountEmail}` : ""}.{" "}
        {googleDrive.folderName || googleDrive.folderId
          ? `Загрузка будет идти в ${googleDrive.folderName ? `папку ${googleDrive.folderName}` : "указанную папку My Drive"}.`
          : "Файлы будут загружаться в доступную папку My Drive по текущей OAuth-связке."}
      </div>
    );
  }

  return (
    <div className="empty-inline empty-inline--subtle">
      <h3>Google Drive пока не подключён.</h3>
      <p>
        Вы всё ещё можете сохранить внешние ссылки вручную, но загрузка файла прямо из creative workflow станет доступна
        после подключения Drive в админ-разделе.
      </p>
      <div className="hero-actions">
        <Link className="button button--secondary button--compact" href="/admin/google-drive">
          Открыть настройку Google Drive
        </Link>
      </div>
    </div>
  );
}

export function CreativeForm({
  action,
  approaches,
  error,
  heading,
  description,
  submitLabel,
  cancelHref,
  values,
  googleDrive
}: CreativeFormProps) {
  return (
    <section className="editor-layout">
      <article className="panel">
        <div className="panel-content">
          <div className="section-card__header">
            <h3>{heading}</h3>
            <p>{description}</p>
          </div>

          {error ? <div className="flash-message flash-message--error">{error}</div> : null}

          <form action={action} className="stack">
            <div className="form-grid">
              <div className="field">
                <label className="field__label" htmlFor="creative-name">
                  Название креатива
                </label>
                <input
                  className="auth-input"
                  defaultValue={values.name}
                  id="creative-name"
                  name="name"
                  placeholder="Например, Past Life Hook V1"
                  required
                  type="text"
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="creative-approach">
                  Подход
                </label>
                <select className="auth-input" defaultValue={values.approachId} id="creative-approach" name="approachId" required>
                  <option value="">Выберите подход</option>
                  {approaches.map((approach) => (
                    <option key={approach.id} value={approach.id}>
                      {approach.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="creative-status">
                  Lifecycle-статус
                </label>
                <select className="auth-input" defaultValue={values.currentStatus} id="creative-status" name="currentStatus" required>
                  {lifecycleStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="creative-type">
                  Тип
                </label>
                <input
                  className="auth-input"
                  defaultValue={values.type}
                  id="creative-type"
                  name="type"
                  placeholder="UGC, image, video"
                  type="text"
                />
              </div>
            </div>

            <div className="section-card section-card--detailed section-card--muted">
              <div className="section-card__header">
                <h3>Медиа и внешнее хранение</h3>
                <p>
                  Этот блок остаётся preview-first и link-first: оригиналы предпочтительно живут в Google Drive, а
                  карточка креатива хранит ссылки, превью и lightweight metadata.
                </p>
              </div>

              <div className="media-summary-grid">
                <section className="stat-card">
                  <span className="stat-label">Состояние Drive</span>
                  <strong className="stat-value stat-value--compact">{googleDrive.connected ? "Подключён" : "Не подключён"}</strong>
                  <p className="stat-copy">
                    {googleDrive.connected
                      ? googleDrive.accountEmail ?? "Готов к загрузке файлов"
                      : "Файл можно будет отправлять прямо в My Drive после подключения."}
                  </p>
                </section>

                <section className="stat-card">
                  <span className="stat-label">Папка загрузки</span>
                  <strong className="stat-value stat-value--compact">
                    {googleDrive.folderName ?? (googleDrive.folderConfigured ? "Указана" : "По умолчанию")}
                  </strong>
                  <p className="stat-copy">
                    {googleDrive.folderId
                      ? `Folder ID: ${googleDrive.folderId}`
                      : "Можно оставить без folder ID и использовать связанную область My Drive."}
                  </p>
                </section>
              </div>

              {renderGoogleDriveStatus(googleDrive)}

              {googleDrive.lastErrorMessage ? (
                <div className="flash-message flash-message--error">{googleDrive.lastErrorMessage}</div>
              ) : null}

              <div className="form-grid">
                <div className="field">
                  <label className="field__label" htmlFor="creative-drive-upload">
                    Загрузить файл в Google Drive
                  </label>
                  <input
                    className="auth-input"
                    disabled={!googleDrive.connected}
                    id="creative-drive-upload"
                    name="driveUploadFile"
                    type="file"
                  />
                  <p className="field__hint">
                    Если выбрать файл и Drive подключён, сервер загрузит оригинал в Drive и автоматически подставит
                    Drive-backed ссылки и metadata. Ручные значения в полях ниже остаются приоритетными.
                  </p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-source-url">
                    Original / source link
                  </label>
                  <input className="auth-input" defaultValue={values.sourceUrl} id="creative-source-url" name="sourceUrl" placeholder="https://..." type="url" />
                  <p className="field__hint">Ссылка на оригинал или основной внешний источник медиа.</p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-asset-url">
                    Asset link
                  </label>
                  <input className="auth-input" defaultValue={values.assetUrl} id="creative-asset-url" name="assetUrl" placeholder="https://..." type="url" />
                  <p className="field__hint">Рабочая ссылка на asset для команды, если она отличается от original.</p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-preview-url">
                    Preview link
                  </label>
                  <input className="auth-input" defaultValue={values.previewUrl} id="creative-preview-url" name="previewUrl" placeholder="https://..." type="url" />
                  <p className="field__hint">Сюда лучше вести ссылку, которую удобно быстро открыть и просмотреть.</p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-thumbnail-url">
                    Poster / thumbnail
                  </label>
                  <input className="auth-input" defaultValue={values.thumbnailUrl} id="creative-thumbnail-url" name="thumbnailUrl" placeholder="https://..." type="url" />
                  <p className="field__hint">Лёгкая ссылка на картинку-превью, если она уже есть отдельно.</p>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-drive-file-id">
                    Google Drive file ID
                  </label>
                  <input className="auth-input" defaultValue={values.driveFileId} id="creative-drive-file-id" name="driveFileId" placeholder="1AbCdEf..." type="text" />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-drive-view-link">
                    Google Drive view link
                  </label>
                  <input className="auth-input" defaultValue={values.driveWebViewLink} id="creative-drive-view-link" name="driveWebViewLink" placeholder="https://drive.google.com/..." type="url" />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-drive-download-link">
                    Google Drive download link
                  </label>
                  <input className="auth-input" defaultValue={values.driveDownloadUrl} id="creative-drive-download-link" name="driveDownloadUrl" placeholder="https://..." type="url" />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-source-filename">
                    Имя файла
                  </label>
                  <input className="auth-input" defaultValue={values.sourceFilename} id="creative-source-filename" name="sourceFilename" placeholder="hook-v3.mp4" type="text" />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-source-mimetype">
                    MIME type
                  </label>
                  <input className="auth-input" defaultValue={values.sourceMimeType} id="creative-source-mimetype" name="sourceMimeType" placeholder="video/mp4" type="text" />
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="creative-source-byte-size">
                    Размер в байтах
                  </label>
                  <input className="auth-input" defaultValue={values.sourceByteSize} id="creative-source-byte-size" min={0} name="sourceByteSize" placeholder="10485760" type="number" />
                </div>
              </div>
            </div>

            <div className="field">
              <span className="field__label">Метки</span>
              <div className="checkbox-grid">
                {creativeLabelOptions.map((label) => (
                  <label className="checkbox-card" key={label.value}>
                    <input defaultChecked={values.labels.includes(label.dbValue)} name="labels" type="checkbox" value={label.value} />
                    <div className="checkbox-card__copy">
                      <strong>{label.label}</strong>
                      <span>{label.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="creative-notes">
                Заметки
              </label>
              <textarea
                className="auth-input textarea-input"
                defaultValue={values.notes}
                id="creative-notes"
                name="notes"
                placeholder="Короткий operational-контекст по креативу."
                rows={6}
              />
            </div>

            <div className="hero-actions">
              <button className="button button--primary" type="submit">
                {submitLabel}
              </button>
              <Link className="button button--secondary" href={cancelHref}>
                Отмена
              </Link>
            </div>
          </form>
        </div>
      </article>

      <aside className="stack">
        <section className="stat-card">
          <span className="stat-label">Обязательная связь</span>
          <strong className="stat-value stat-value--compact">Creative {"->"} Approach</strong>
          <p className="stat-copy">Креатив всегда принадлежит ровно одному подходу.</p>
        </section>
        <section className="stat-card">
          <span className="stat-label">Preview-first policy</span>
          <strong className="stat-value stat-value--compact">Drive originals, app links</strong>
          <p className="stat-copy">
            Полные оригиналы по умолчанию живут во внешнем Drive, а приложение хранит ссылки, превью и lightweight metadata.
          </p>
        </section>
        <section className="stat-card">
          <span className="stat-label">Статусы отдельно</span>
          <strong className="stat-value stat-value--compact">queue / active / stopped / scaling</strong>
          <p className="stat-copy">Lifecycle-статус определяет рабочую фазу, а не оценочную метку.</p>
        </section>
      </aside>
    </section>
  );
}
