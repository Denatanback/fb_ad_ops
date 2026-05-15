"use client";

import { useEffect, useRef } from "react";
import { syncGoogleDriveCreativesAction } from "@/app/(workspace)/creatives/actions";

export function DriveSyncTrigger() {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    
    syncGoogleDriveCreativesAction().catch((err) => {
      console.error("Drive sync failed:", err);
    });
  }, []);

  return null;
}
