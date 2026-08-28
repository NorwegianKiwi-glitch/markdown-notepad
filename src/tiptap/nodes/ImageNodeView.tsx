import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { useNoteDir } from "../NoteDirContext";

const EXTERNAL_SRC = /^(https?:|data:|blob:)/i;
const MIN_WIDTH = 80;

// The markdown "title" slot (![alt](src "title")) is repurposed to store the
// image's display width in pixels, since standard markdown has no size syntax
// of its own. Other viewers just show it as a harmless tooltip.
export function ImageNodeView({ node, selected, updateAttributes }: NodeViewProps) {
  const noteDir = useNoteDir();
  const rawSrc = (node.attrs.src as string) ?? "";
  const alt = (node.attrs.alt as string) ?? "";
  const width = node.attrs.title ? Number(node.attrs.title) : undefined;

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const frameRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);

    if (EXTERNAL_SRC.test(rawSrc) || !noteDir) {
      setResolvedSrc(EXTERNAL_SRC.test(rawSrc) ? rawSrc : null);
      return;
    }

    join(noteDir, rawSrc)
      .then((absolute) => {
        if (!cancelled) setResolvedSrc(convertFileSrc(absolute));
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to resolve image path", { rawSrc, noteDir }, err);
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rawSrc, noteDir]);

  function handleResizeStart(event: ReactPointerEvent) {
    event.preventDefault();
    const frame = frameRef.current;
    if (!frame) return;

    const startX = event.clientX;
    const startWidth = frame.getBoundingClientRect().width;
    const maxWidth = frame.closest(".ProseMirror")?.getBoundingClientRect().width ?? startWidth;

    setIsResizing(true);

    function handlePointerMove(moveEvent: PointerEvent) {
      // The frame is centered, so growing it by ΔW moves each edge by ΔW / 2.
      // Doubling the pointer delta keeps the handle tracking the cursor 1:1.
      const nextWidth = Math.round(
        Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + (moveEvent.clientX - startX) * 2)),
      );
      updateAttributes({ title: String(nextWidth) });
    }

    function handlePointerUp() {
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <NodeViewWrapper as="div" className={selected ? "image-node selected" : "image-node"}>
      {resolvedSrc && !loadError ? (
        <span
          ref={frameRef}
          className={isResizing ? "image-frame resizing" : "image-frame"}
          style={width ? { width } : undefined}
        >
          <img
            src={resolvedSrc}
            alt={alt}
            onDoubleClick={() => updateAttributes({ title: null })}
            onError={(event) => {
              console.error("Image failed to load", { rawSrc, noteDir, resolvedSrc: event.currentTarget.src });
              setLoadError(true);
            }}
          />
          {selected && <span className="image-resize-handle" onPointerDown={handleResizeStart} />}
        </span>
      ) : (
        <span className="image-placeholder">
          {loadError ? `Image not found: ${rawSrc}` : "Loading image…"}
        </span>
      )}
    </NodeViewWrapper>
  );
}
