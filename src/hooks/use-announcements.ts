"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AnnouncementsResponse, Sort } from "@/lib/types";

// The list has one refresh function for manual refresh, own mutations,
// and, later, Socket.IO events. No polling and no socket connection yet.
export function useAnnouncements(search: string, sort: Sort, page: number) {
  const [result, setResult] = useState<AnnouncementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const active = useRef<AbortController | null>(null);

  const refreshAnnouncements = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await api.announcements(search, sort, page, controller.signal);
      if (!controller.signal.aborted) { setResult(response); setUpdatedAt(new Date()); }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Не вдалося завантажити оголошення.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, sort, page]);

  useEffect(() => {
    void refreshAnnouncements();
    return () => active.current?.abort();
  }, [refreshAnnouncements]);

  // TODO(practice): subscribe to announcement events here.
  // Reuse refreshAnnouncements and clean up listeners on unmount.

  return { result, loading, error, updatedAt, refreshAnnouncements };
}
