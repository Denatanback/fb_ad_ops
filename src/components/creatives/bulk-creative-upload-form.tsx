"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { bulkUploadCreativesAction, type BulkCreativeUploadState } from "@/app/(workspace)/creatives/actions";
import { lifecycleStatusOptions } from "@/lib/creative-taxonomy";
import { getBulkCreativeUploadAcceptValue } from "@/server/services/creative-media";

type ApproachOption = {
  id: string;
  name: string;
};

type DriveFolderOption = {
  id: string;
  name: string;
  webViewLink: string | null;
  createdTime: string | null;
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

const initialBulkCreativeUploadState: BulkCreativeUploadState = {
  status: "idle",
  summary: {
    totalFiles: 0,
    createdCount: 0,
    failedCount: 0
  },
  items: [],
  message: null
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button button--primary" disabled={disabled || pending} type="submit">
      {pending ? "Загружаем batch..." : "Загрузить batch"}
    </button>
  );
}

function renderDriveState(googleDrive: GoogleDriveFormStatus) {
  if (googleDrive.connected) {
    return (
      <div className="flash-message flash-message--success">
        Google Drive подключён
        {googleDrive.accountEmail ? `: ${googleDrive.accountEmail}` : ""}. Batch upload будет отправлять оригиналы сразу во
        внешнее хранилище.
      </div>
    );
  }

  return (
    <div className="empty-inline">
      <h3>Для batch upload нужен Google Drive.</h3>
      <p>
        Bulk workflow не хранит оригиналы на app server по умолчанию. Сначала подключите Drive, затем вернитесь к этой
        странице.
      </p>
      <div className="hero-actions">
        <Link className="button button--secondary" href="/admin/google-drive">
          Открыть Google Drive
        </Link>
      </div>
    </div>
  );
}

export function BulkCreativeUploadForm({
  approaches,
  googleDrive,
  driveFolders = []
}: {
  approaches: ApproachOption[];
  googleDrive: GoogleDriveFormStatus;
  driveFolders?: DriveFolderOption[];
}) {
  const [state, action] = useFormState(bulkUploadCreativesAction, initialBulkCreativeUploadState);
  const isDriveReady = googleDrive.connected && driveFolders.length > 0;

  return (
    <section className="list-layout">
      <article className="panel">
        <div className="panel-content">
          <div className="section-card__header">
            <h3>Batch upload creatives</h3>
            <p>Один общий подход и статус, дальше по одному Creative record на файл с именем из filename.</p>
          </div>

          <form action={action} className="stack">
            <div className="form-grid">
              <div className="field">
                <label className="field__label" htmlFor="bulk-creative-folder">
                  Папка в Drive
                  {googleDrive.folderName ? (
                    <span className="field__label-hint"> · в «{googleDrive.folderName}»</span>
                  ) : null}
                </label>
                {driveFolders.length > 0 ? (
                  <select className="auth-input" defaultValue="" id="bulk-creative-folder" name="driveFolderId" required>
                    <option value="" disabled>
                      Выберите папку
                    </option>
                    {driveFolders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <select className="auth-input" disabled id="bulk-creative-folder" name="driveFolderId">
                      <option value="">Нет подпапок</option>
                    </select>
                    <p className="field__hint">
                      Сначала создайте подпапки в{" "}
                      <Link href="/admin/google-drive/folders">настройках Drive</Link>, затем вернитесь.
                    </p>
                  </>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="bulk-creative-approach">
                  Подход
                </label>
                <select className="auth-input" defaultValue="" id="bulk-creative-approach" name="approachId" required>
                  <option value="">Выберите подход</option>
                  {approaches.map((approach) => (
                    <option key={approach.id} value={approach.id}>
                      {approach.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="bulk-creative-status">
                  Начальный lifecycle-статус
                </label>
                <select className="auth-input" defaultValue="queue" id="bulk-creative-status" name="currentStatus" required>
                  {lifecycleStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="bulk-creative-files">
                Файлы creatives
              </label>
              <input
                accept={getBulkCreativeUploadAcceptValue()}
                className="auth-input"
                disabled={!isDriveReady}
                id="bulk-creative-files"
                multiple
                name="files"
                required
                type="file"
              />
              <p className="field__hint">
                Поддерживаются видео и статичные креативы. Тип определяется по MIME type и расширению файла.
              </p>
            </div>

            <div className="hero-actions">
              <SubmitButton disabled={!isDriveReady} />
              <Link className="button button--secondary" href="/creatives/new">
                Один креатив вручную
              </Link>
            </div>
          </form>

          {state.message ? <div className={`flash-message flash-message--${state.status === "success" ? "success" : "error"}`}>{state.message}</div> : null}

          {state.items.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Файл</th>
                    <th>Тип</th>
                    <th>Результат</th>
                    <th>Комментарий</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((item) => (
                    <tr key={`${item.filename}-${item.creativeId ?? item.message}`}>
                      <td>
                        <div className="table-primary">
                          <strong>{item.creativeName ?? item.filename}</strong>
                          <span className="table-subcopy mono">{item.filename}</span>
                        </div>
                      </td>
                      <td>{item.mediaType === "video" ? "Видео" : item.mediaType === "static" ? "Статика" : "Неизвестно"}</td>
                      <td>
                        <span className={`pill ${item.outcome === "created" ? "pill--ready" : "pill--warning"}`}>
                          {item.outcome === "created" ? "создан" : "ошибка"}
                        </span>
                      </td>
                      <td className="table-muted">{item.message}</td>
                      <td className="table-actions">
                        {item.creativeId ? (
                          <Link className="button button--secondary button--compact" href={`/creatives/${item.creativeId}`}>
                            Открыть
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </article>

      <aside className="stack">
        <section className="stat-card">
          <span className="stat-label">Batch context</span>
          <strong className="stat-value stat-value--compact">1 approach, 1 status</strong>
          <p className="stat-copy">Все выбранные файлы создаются как отдельные creatives внутри одного общего контекста.</p>
        </section>

        <section className="stat-card">
          <span className="stat-label">Naming signal</span>
          <strong className="stat-value stat-value--compact">Filename {"->"} title</strong>
          <p className="stat-copy">В первом MVP-pass имя берётся из filename без расширения и без сложного парсинга.</p>
        </section>

        {renderDriveState(googleDrive)}

        {state.items.length ? (
          <section className="stat-card">
            <span className="stat-label">Итог batch</span>
            <strong className="stat-value stat-value--compact">{state.summary.createdCount}</strong>
            <p className="stat-copy">
              Всего файлов: {state.summary.totalFiles}. Ошибок или пропусков: {state.summary.failedCount}.
            </p>
          </section>
        ) : null}
      </aside>
    </section>
  );
}
