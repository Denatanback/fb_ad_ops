"use client";

import { useState, useTransition } from "react";
import type { GalleryCreative } from "@/server/services/creatives";
import { useGalleryManager, type BulkStatus } from "./gallery-manager";

type Props = {
  allCreatives: GalleryCreative[];
};

function triggerZipDownload(files: Array<{ id: string; name: string }>, archiveName: string) {
  fetch("/api/drive-download-zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files, archiveName })
  })
    .then((res) => {
      if (!res.ok) throw new Error("ZIP download failed");
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = archiveName + ".zip";
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((err) => alert("Ошибка при скачивании: " + err.message));
}

const STATUS_OPTIONS: Array<{ value: BulkStatus; label: string; mod: string }> = [
  { value: "QUEUE", label: "Queue", mod: "queue" },
  { value: "ACTIVE", label: "Active", mod: "active" },
  { value: "STOPPED", label: "Stop", mod: "stop" }
];

export function GalleryBulkBar({ allCreatives }: Props) {
  const { selectedIds, clearSelection, isSelecting, setIsSelecting, selectAll, onBulkSetStatus } = useGalleryManager();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isSelecting && selectedIds.size === 0) {
    return (
      <div className="gallery-bulk-trigger">
        <button
          className="button button--secondary button--compact"
          onClick={() => setIsSelecting(true)}
          type="button"
        >
          Выбрать несколько
        </button>
      </div>
    );
  }

  const selectedCreatives = allCreatives.filter((c) => selectedIds.has(c.id) && c.driveFileId);
  const allIds = allCreatives.map((c) => c.id);

  function handleSelectAll() {
    selectAll(allIds);
  }

  function handleDownloadSelected() {
    if (selectedCreatives.length === 0) {
      alert("Нет выбранных файлов с Drive-ссылкой");
      return;
    }
    setIsDownloading(true);
    const files = selectedCreatives.map((c) => ({
      id: c.driveFileId!,
      name: c.sourceFilename ?? c.name
    }));
    triggerZipDownload(files, "creatives-selection");
    setTimeout(() => setIsDownloading(false), 3000);
  }

  function handleCancel() {
    clearSelection();
    setIsSelecting(false);
  }

  function handleSetStatus(status: BulkStatus) {
    startTransition(() => {
      onBulkSetStatus(status);
    });
  }

  return (
    <div className="gallery-bulk-bar">
      <span className="gallery-bulk-bar__count">
        {selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : "Ничего не выбрано"}
      </span>

      <div className="gallery-bulk-bar__actions">
        <button
          className="button button--secondary button--compact"
          onClick={handleSelectAll}
          type="button"
        >
          Все ({allCreatives.length})
        </button>

        {selectedIds.size > 0 ? (
          <div className="gallery-bulk-bar__status-group">
            <span className="gallery-bulk-bar__group-label">Статус:</span>
            {STATUS_OPTIONS.map(({ value, label, mod }) => (
              <button
                key={value}
                className={`gallery-bulk-status-btn gallery-bulk-status-btn--${mod}`}
                disabled={isPending}
                onClick={() => handleSetStatus(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <button
          className="button button--primary button--compact"
          disabled={selectedCreatives.length === 0 || isDownloading}
          onClick={handleDownloadSelected}
          type="button"
        >
          {isDownloading ? "Готовим ZIP..." : `Скачать ZIP (${selectedCreatives.length})`}
        </button>

        <button
          className="button button--secondary button--compact"
          onClick={handleCancel}
          type="button"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
