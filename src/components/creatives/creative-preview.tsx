"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreativePreviewSource } from "@/server/services/creative-media";

type CreativePreviewProps = {
  alt: string;
  sources: CreativePreviewSource[];
  imageClassName: string;
  videoClassName?: string;
  fallbackClassName: string;
  fallbackLabel: string;
  videoControls?: boolean;
};

function joinClasses(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function CreativePreview({
  alt,
  sources,
  imageClassName,
  videoClassName,
  fallbackClassName,
  fallbackLabel,
  videoControls = false
}: CreativePreviewProps) {
  const previewSources = useMemo(
    () =>
      sources.filter((source, index) => {
        if (!source.url) {
          return false;
        }

        return sources.findIndex((candidate) => candidate.url === source.url) === index;
      }),
    [sources]
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [previewSources]);

  const activeSource = previewSources[sourceIndex] ?? null;

  if (!activeSource) {
    return <div className={fallbackClassName}>{fallbackLabel}</div>;
  }

  const handleError = () => {
    setSourceIndex((currentIndex) => currentIndex + 1);
  };

  if (activeSource.kind === "video") {
    return (
      <video
        className={joinClasses(imageClassName, videoClassName)}
        controls={videoControls}
        muted={!videoControls}
        onError={handleError}
        playsInline
        preload="metadata"
        src={activeSource.url}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className={imageClassName} loading="lazy" onError={handleError} src={activeSource.url} />
  );
}
