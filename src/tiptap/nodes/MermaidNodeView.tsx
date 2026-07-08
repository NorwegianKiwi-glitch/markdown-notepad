import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { Mermaid } from "../../components/Mermaid";

export function MermaidNodeView({ node }: NodeViewProps) {
  const isMermaid = node.attrs.language === "mermaid";

  if (!isMermaid) {
    return (
      <NodeViewWrapper as="pre" className="code-block-node">
        <NodeViewContent<"code"> as="code" />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="mermaid-node">
      <pre className="mermaid-source">
        <NodeViewContent<"code"> as="code" />
      </pre>
      <div className="mermaid-preview" contentEditable={false}>
        <Mermaid chart={node.textContent} />
      </div>
    </NodeViewWrapper>
  );
}
