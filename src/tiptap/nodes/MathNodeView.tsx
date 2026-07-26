import { useEffect, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

interface MathNodeViewProps extends NodeViewProps {
  display: "inline" | "block";
}

// katex is only needed once a note actually contains a formula, so it's
// fetched on first render rather than bundled into every editor session.
let katexPromise: Promise<typeof import("katex")["default"]> | null = null;

function getKatex() {
  if (!katexPromise) {
    katexPromise = Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(
      ([mod]) => mod.default,
    );
  }
  return katexPromise;
}

export function MathNodeView({ node, updateAttributes, selected, display }: MathNodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [katex, setKatex] = useState<typeof import("katex")["default"] | null>(null);
  const formula = (node.attrs.formula as string) ?? "";
  const wrapperTag = display === "block" ? "div" : "span";

  useEffect(() => {
    let cancelled = false;
    getKatex().then((mod) => {
      if (!cancelled) setKatex(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (editing) {
    return (
      <NodeViewWrapper as={wrapperTag} className={`math-node math-node-${display} editing`}>
        <input
          autoFocus
          value={formula}
          onChange={(e) => updateAttributes({ formula: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          placeholder={display === "block" ? "E = mc^2" : "x^2"}
        />
      </NodeViewWrapper>
    );
  }

  let html: string;
  if (!katex) {
    html = `<span class="math-placeholder">Loading…</span>`;
  } else {
    try {
      html = formula
        ? katex.renderToString(formula, { displayMode: display === "block", throwOnError: false })
        : `<span class="math-placeholder">${display === "block" ? "Block" : "Inline"} formula</span>`;
    } catch {
      html = `<span class="math-placeholder">Invalid formula</span>`;
    }
  }

  return (
    <NodeViewWrapper
      as={wrapperTag}
      className={`math-node math-node-${display}${selected ? " selected" : ""}`}
    >
      <span onClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
}
