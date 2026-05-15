"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { CreativePreview } from "@/components/creatives/creative-preview";
import { detectCreativeMediaType, resolveCreativePreview } from "@/server/services/creative-media";
import type { GalleryCreative } from "@/server/services/creatives";
import { useGalleryManagerOptional } from "./gallery-manager";

type Props = {
  creative: GalleryCreative;
};

function formatStatus(status: GalleryCreative["currentStatus"]) {
  return status === "STOPPED" ? "stop" : status.toLowerCase();
}

export function CreativeGalleryCard({ creative }: Props) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(creative.name);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const manager = useGalleryManagerOptional();

  const isSelected = manager?.selectedIds.has(creative.id) ?? false;
  const isSelectMode = manager?.isSelecting ?? false;

  const mediaKind = detectCreativeMediaType({
    name: creative.sourceFilename ?? creative.name,
    type: creative.sourceMimeType
  }) ?? "static";
  const preview = resolveCreativePreview({
    name: creative.name,
    sourceFilename: creative.sourceFilename,
    sourceMimeType: creative.sourceMimeType,
    thumbnailUrl: creative.thumbnailUrl,
    previewUrl: creative.previewUrl,
    assetUrl: creative.assetUrl,
    sourceUrl: creative.sourceUrl,
    driveDownloadUrl: creative.driveDownloadUrl,
    driveWebViewLink: creative.driveWebViewLink
  });
  const isVideo = mediaKind === "video";

  function startRename(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRenameValue(creative.name);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  function commitRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === creative.name) {
      setIsRenaming(false);
      return;
    }
    startTransition(async () => {
      if (manager) {
        await manager.onRename(creative, trimmed);
      }
      setIsRenaming(false);
    });
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setIsRenaming(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    manager?.onDelete(creative);
  }

  function handleCheckboxClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    manager?.toggleSelect(creative.id);
  }

  const downloadUrl = creative.driveFileId
    ? `/api/drive-download/${creative.driveFileId}?filename=${encodeURIComponent(creative.sourceFilename ?? creative.name)}`
    : creative.driveDownloadUrl ?? null;

  return (
    <article className={`gallery-card${isSelected ? " gallery-card--selected" : ""}`}>
      {isSelectMode ? (
        <button
          aria-label={isSelected ? "Снять выделение" : "Выбрать"}
          className={`gallery-card__checkbox${isSelected ? " gallery-card__checkbox--checked" : ""}`}
          onClick={handleCheckboxClick}
          type="button"
        />
      ) : null}

      <Link className="gallery-card__main" href={`/creatives/${creative.id}`} tabIndex={isSelectMode ? -1 : 0}>
        <div className="gallery-card__thumb">
          <CreativePreview
            alt={creative.name}
            fallbackClassName="gallery-card__thumb-placeholder"
            fallbackLabel={isVideo ? "Нет превью видео" : "Нет превью"}
            imageClassName="gallery-card__img"
            sources={preview.sources}
            videoClassName="gallery-card__video"
          />
        </div>

        <div className="gallery-card__body">
          {isRenaming ? (
            <input
              autoFocus
              className="gallery-card__rename-input"
              disabled={isPending}
              maxLength={200}
              onBlur={commitRename}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              ref={inputRef}
              type="text"
              value={renameValue}
            />
          ) : (
            <span className="gallery-card__name">{creative.name}</span>
          )}
          <span className="gallery-card__approach">{creative.approach?.name ?? "Без воронки"}</span>

          <div className="gallery-card__meta">
            <span className="gallery-chip">{isVideo ? "vid" : "img"}</span>
            <span className={`gallery-chip gallery-chip--status gallery-chip--${formatStatus(creative.currentStatus)}`}>
              {formatStatus(creative.currentStatus)}
            </span>
            {creative.driveFolderName ? (
              <span className="gallery-chip gallery-chip--folder" title={creative.driveFolderName}>
                {creative.driveFolderName.length > 12 ? creative.driveFolderName.slice(0, 12) + "…" : creative.driveFolderName}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="gallery-card__actions">
        {downloadUrl ? (
          <a
            aria-label="Скачать"
            className="gallery-card__action-btn"
            download
            href={downloadUrl}
            onClick={(e) => e.stopPropagation()}
            title="Скачать"
          >
            ↓
          </a>
        ) : null}
        <button
          aria-label="Переименовать"
          className="gallery-card__action-btn"
          disabled={isPending}
          onClick={startRename}
          title="Переименовать"
          type="button"
        >
          ✎
        </button>
        <button
          aria-label="Удалить"
          className="gallery-card__action-btn gallery-card__action-btn--danger"
          disabled={isPending}
          onClick={handleDelete}
          title="Удалить из Drive и системы"
          type="button"
        >
          ✕
        </button>
      </div>
    </article>
  );
}
