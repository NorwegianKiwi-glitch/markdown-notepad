import "./ResizeHandle.css";

interface ResizeHandleProps {
  isResizing: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  // Which side of the viewport the panel is docked to; determines which way
  // the toggle button's chevron points in each state.
  side: "left" | "right";
}

export function ResizeHandle({ isResizing, onPointerDown, collapsed, onToggleCollapse, side }: ResizeHandleProps) {
  const collapseGlyph = side === "left" ? "‹" : "›";
  const expandGlyph = side === "left" ? "›" : "‹";

  return (
    <div
      className={["resize-handle", collapsed && "collapsed", isResizing && "resizing"].filter(Boolean).join(" ")}
      onPointerDown={collapsed ? undefined : onPointerDown}
      role="separator"
      aria-orientation="vertical"
    >
      <button
        type="button"
        className="collapse-toggle"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Show panel" : "Hide panel"}
        title={collapsed ? "Show panel" : "Hide panel"}
      >
        {collapsed ? expandGlyph : collapseGlyph}
      </button>
    </div>
  );
}
