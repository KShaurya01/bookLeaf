"use client";

import { useEffect, useRef } from "react";

export function useEventSource(
  url: string | null | undefined,
  onEvent: (event: string, data: unknown) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!url || url.includes("undefined") || url.includes("null")) return;

    let es: EventSource;
    try {
      es = new EventSource(url);
    } catch {
      return;
    }

    const handler = (eventName: string) => (e: MessageEvent) => {
      try {
        onEventRef.current(eventName, JSON.parse(e.data));
      } catch {
        onEventRef.current(eventName, e.data);
      }
    };

    es.addEventListener("ticket_updated", handler("ticket_updated"));
    es.addEventListener("tickets_updated", handler("tickets_updated"));
    es.addEventListener("queue_updated", handler("queue_updated"));
    es.addEventListener("connected", handler("connected"));
    es.onerror = () => {
      // Keep connection attempts quiet; browser will retry. Avoid throwing.
    };

    return () => es.close();
  }, [url]);
}
