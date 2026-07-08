import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathNodeViewProps extends NodeViewProps {
  display: "inline" | "block";
}

export function MathNodeView({ node, updateAttributes, selected, display }: MathNodeViewProps) {
  const [editing, setEditing] = useState(false);
  const formula = (node.attrs.formula as string) ?? "";
  const wrapperTag = display === "block" ? "div" : "span";

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
  try {
    html = formula
      ? katex.renderToString(formula, { displayMode: display === "block", throwOnError: false })
      : `<span class="math-placeholder">${display === "block" ? "Block" : "Inline"} formula</span>`;
  } catch {
    html = `<span class="math-placeholder">Invalid formula</span>`;
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
