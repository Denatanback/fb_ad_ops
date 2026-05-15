"use client";

import { useState, useTransition } from "react";
import { SectionCard } from "@/components/workspace/section-card";
import type { DriveFolderInfo } from "@/server/integrations/google-drive/service";
import { createDriveFolderAction, deleteDriveFolderAction } from "./actions";

type Props = {
  initialFolders: DriveFolderInfo[];
  rootFolderId: string | null;
};

export function DriveFolderManager({ initialFolders, rootFolderId }: Props) {
  const [folders, setFolders] = useState(initialFolders);
  const [newFolderName, setNewFolderName] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    const name = newFolderName.trim();
    if (!name) return;

    startTransition(async () => {
      const result = await createDriveFolderAction(name, rootFolderId);
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok && result.folderId) {
        setFolders((prev) => [...prev, { id: result.folderId!, name, webViewLink: null, createdTime: null }]);
        setNewFolderName("");
      }
    });
  }

  function handleDelete(folderId: string, folderName: string) {
    if (!confirm(`Удалить папку «${folderName}» из Google Drive? Это действие необратимо.`)) return;

    startTransition(async () => {
      const result = await deleteDriveFolderAction(folderId);
      setMessage({ text: result.message, ok: result.ok });
      if (result.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
      }
    });
  }

  return (
    <div className="stack">
      <SectionCard title="Создать папку" description="Папка будет создана внутри корневой папки Google Drive.">
        <div className="compact-filter-form" style={{ alignItems: "flex-end" }}>
          <label className="field field--compact" style={{ flex: 1 }}>
            <span className="field__label">Название папки</span>
            <input
              className="auth-input"
              disabled={isPending}
              maxLength={100}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Например: Март 2026 — HVT"
              type="text"
              value={newFolderName}
            />
          </label>
          <button
            className="button button--primary button--compact"
            disabled={isPending || !newFolderName.trim()}
            onClick={handleCreate}
            type="button"
          >
            {isPending ? <span aria-hidden="true" className="loading-spinner" /> : null}
            <span>{isPending ? "Creating..." : "Создать папку"}</span>
          </button>
        </div>

        {isPending ? (
          <div className="pending-status" role="status" aria-live="polite" style={{ marginTop: 10 }}>
            <span aria-hidden="true" className="loading-spinner" />
            <div>
              <strong>Processing Google Drive action...</strong>
              <span>This may take a few moments.</span>
            </div>
          </div>
        ) : null}

        {message ? (
          <div className={`flash-message flash-message--${message.ok ? "success" : "error"}`} style={{ marginTop: 10 }}>
            {message.text}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={`Папки (${folders.length})`} description="Папки внутри корневой папки Google Drive.">
        {folders.length === 0 ? (
          <div className="empty-inline empty-inline--subtle">
            <h3>Папок пока нет</h3>
            <p>Создайте первую папку выше, чтобы организовать загрузку креативов.</p>
          </div>
        ) : (
          <div className="table-shell">
            <table className="data-table data-table--dense">
              <thead>
                <tr>
                  <th>Папка</th>
                  <th>ID</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {folders.map((folder) => (
                  <tr key={folder.id}>
                    <td>
                      <div className="table-primary">
                        <strong>{folder.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="table-muted mono" style={{ fontSize: "0.75rem" }}>{folder.id}</span>
                    </td>
                    <td className="table-actions">
                      {folder.webViewLink ? (
                        <a
                          className="button button--secondary button--compact"
                          href={folder.webViewLink}
                          rel="noreferrer"
                          style={{ marginRight: 6 }}
                          target="_blank"
                        >
                          Открыть
                        </a>
                      ) : null}
                      <button
                        className="button button--compact"
                        disabled={isPending}
                        onClick={() => handleDelete(folder.id, folder.name)}
                        style={{ backgroundColor: "var(--color-status-error, #D32F2F)", color: "white" }}
                        type="button"
                      >
                        {isPending ? <span aria-hidden="true" className="loading-spinner" /> : null}
                        <span>{isPending ? "Deleting..." : "Удалить"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
