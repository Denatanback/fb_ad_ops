"use client";

import { createContext, useContext, useState, useTransition, useCallback } from "react";
import type { GalleryCreative } from "@/server/services/creatives";
import { deleteCreativeAction, renameCreativeAction, bulkSetStatusAction } from "@/app/(workspace)/creatives/actions";

export type BulkStatus = "QUEUE" | "ACTIVE" | "STOPPED";

export type GalleryManagerContextValue = {
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  onDelete: (creative: GalleryCreative) => Promise<void>;
  onRename: (creative: GalleryCreative, newName: string) => Promise<void>;
  onBulkSetStatus: (status: BulkStatus) => void;
  isSelecting: boolean;
  setIsSelecting: (v: boolean) => void;
};

export const GalleryManagerContext = createContext<GalleryManagerContextValue | null>(null);

export function useGalleryManager(): GalleryManagerContextValue {
  const ctx = useContext(GalleryManagerContext);
  if (!ctx) throw new Error("useGalleryManager must be used inside GalleryManagerProvider");
  return ctx;
}

export function useGalleryManagerOptional(): GalleryManagerContextValue | null {
  return useContext(GalleryManagerContext);
}

type Props = {
  children: React.ReactNode;
  allCreatives: GalleryCreative[];
  onRefresh?: () => void;
};

export function GalleryManagerProvider({ children, allCreatives }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [, startTransition] = useTransition();

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const onDelete = useCallback(async (creative: GalleryCreative) => {
    if (!confirm(`Удалить «${creative.name}» из Drive и системы? Это действие необратимо.`)) return;
    startTransition(async () => {
      const result = await deleteCreativeAction(creative.id);
      if (!result.ok) alert(result.message);
    });
  }, [startTransition]);

  const onRename = useCallback(async (creative: GalleryCreative, newName: string) => {
    startTransition(async () => {
      const result = await renameCreativeAction(creative.id, newName);
      if (!result.ok) alert(result.message);
    });
  }, [startTransition]);

  const onBulkSetStatus = useCallback((status: BulkStatus) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    startTransition(async () => {
      const result = await bulkSetStatusAction(ids, status);
      if (!result.ok) alert(result.message);
      else setSelectedIds(new Set());
    });
  }, [selectedIds, startTransition]);

  return (
    <GalleryManagerContext.Provider value={{ selectedIds, toggleSelect, selectAll, clearSelection, onDelete, onRename, onBulkSetStatus, isSelecting, setIsSelecting }}>
      {children}
    </GalleryManagerContext.Provider>
  );
}
