import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizableWidthOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey: string;
  // Which side of the viewport the panel is docked to. A "left" panel grows
  // when the handle is dragged right; a "right" panel grows when dragged left.
  side: "left" | "right";
}

function readStoredWidth(storageKey: string, minWidth: number, maxWidth: number, fallback: number): number {
  const stored = Number(localStorage.getItem(storageKey));
  if (!Number.isFinite(stored) || stored <= 0) return fallback;
  return Math.min(maxWidth, Math.max(minWidth, stored));
}

function readStoredCollapsed(storageKey: string): boolean {
  return localStorage.getItem(`${storageKey}Collapsed`) === "true";
}

export function useResizableWidth({ defaultWidth, minWidth, maxWidth, storageKey, side }: UseResizableWidthOptions) {
  const [width, setWidth] = useState(() => readStoredWidth(storageKey, minWidth, maxWidth, defaultWidth));
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed(storageKey));
  const dragState = useRef({ startX: 0, startWidth: width });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      dragState.current = { startX: event.clientX, startWidth: width };
      setIsResizing(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isResizing) return;

    const sign = side === "left" ? 1 : -1;

    function handlePointerMove(event: PointerEvent) {
      const delta = (event.clientX - dragState.current.startX) * sign;
      const next = Math.min(maxWidth, Math.max(minWidth, dragState.current.startWidth + delta));
      setWidth(next);
    }

    function stopResizing() {
      setIsResizing(false);
    }

    document.body.classList.add("resizing-col");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);

    return () => {
      document.body.classList.remove("resizing-col");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, [isResizing, side, minWidth, maxWidth]);

  useEffect(() => {
    localStorage.setItem(storageKey, String(Math.round(width)));
  }, [width, storageKey]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(`${storageKey}Collapsed`, String(next));
      return next;
    });
  }, [storageKey]);

  return { width, isResizing, handlePointerDown, collapsed, toggleCollapsed };
}
