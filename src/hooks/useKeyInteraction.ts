import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const DRAG_THRESHOLD = 6;
export const HOLD_DELAY = 100;

export function isDrag(start: { x: number; y: number }, x: number, y: number) {
  return Math.hypot(x - start.x, y - start.y) > DRAG_THRESHOLD;
}

export function useKeyInteraction() {
  const [sources, setSources] = useState<Record<string, string>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const gesture = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
    held: boolean;
  } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pulseTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const press = useCallback((source: string, id: string) => {
    setSources((previous) => (previous[source] === id ? previous : { ...previous, [source]: id }));
  }, []);
  const release = useCallback((source: string) => {
    setSources((previous) => {
      if (!(source in previous)) return previous;
      const next = { ...previous };
      delete next[source];
      return next;
    });
  }, []);
  const pulse = useCallback(
    (id: string) => {
      const source = `pulse:${id}`;
      clearTimeout(pulseTimers.current.get(source));
      press(source, id);
      pulseTimers.current.set(
        source,
        setTimeout(() => {
          release(source);
          pulseTimers.current.delete(source);
        }, 160),
      );
    },
    [press, release],
  );
  const cancelGesture = useCallback(() => {
    clearTimeout(holdTimer.current);
    gesture.current = null;
    release("pointer");
  }, [release]);
  const clear = useCallback(() => {
    cancelGesture();
    for (const timer of pulseTimers.current.values()) clearTimeout(timer);
    pulseTimers.current.clear();
    setSources({});
    setHoveredId(null);
  }, [cancelGesture]);
  const beginPointer = useCallback(
    (id: string, event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      cancelGesture();
      gesture.current = {
        id,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        held: false,
      };
      holdTimer.current = setTimeout(() => {
        if (gesture.current) {
          gesture.current.held = true;
          press("pointer", gesture.current.id);
        }
      }, HOLD_DELAY);
    },
    [cancelGesture, press],
  );

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const active = gesture.current;
      if (active?.pointerId === event.pointerId && isDrag(active, event.clientX, event.clientY))
        cancelGesture();
    };
    const up = (event: PointerEvent) => {
      const active = gesture.current;
      if (active?.pointerId !== event.pointerId) return;
      if (!active.held && !isDrag(active, event.clientX, event.clientY)) pulse(active.id);
      cancelGesture();
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) cancelGesture();
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancelGesture);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancelGesture);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibility);
      clear();
    };
  }, [cancelGesture, clear, pulse]);

  const pressedIds = useMemo(() => new Set(Object.values(sources)), [sources]);
  return { pressedIds, hoveredId, setHoveredId, beginPointer, clear };
}
export type KeyInteraction = ReturnType<typeof useKeyInteraction>;
