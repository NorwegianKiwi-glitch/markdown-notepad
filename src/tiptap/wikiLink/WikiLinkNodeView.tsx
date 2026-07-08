import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

interface WikiLinkNodeViewProps extends NodeViewProps {
  onNavigate: (target: string) => void;
}

export function WikiLinkNodeView({ node, onNavigate }: WikiLinkNodeViewProps) {
  const target = (node.attrs.target as string) ?? "";

  return (
    <NodeViewWrapper as="span" className="wiki-link">
      <button type="button" className="wiki-link-button" onClick={() => onNavigate(target)}>
        {target}
      </button>
    </NodeViewWrapper>
  );
}
