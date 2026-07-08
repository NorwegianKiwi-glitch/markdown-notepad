import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * ProseMirror only lets a click resolve into a nearby textblock, so clicking
 * between two adjacent tables/mermaid diagrams (or before/after one at the
 * start/end of its parent) lands inside the table/diagram source instead of
 * creating a cursor there. This keeps a paragraph between/around such nodes
 * so there's always somewhere to type.
 */
export const BlockSpacing = Extension.create({
  name: "blockSpacing",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockSpacing"),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const { schema, doc } = newState;
          const paragraphType = schema.nodes.paragraph;
          const tableType = schema.nodes.table;
          const codeBlockType = schema.nodes.codeBlock;
          if (!paragraphType || (!tableType && !codeBlockType)) return null;

          const needsSpacing = (node: ProseMirrorNode) =>
            node.type === tableType ||
            (node.type === codeBlockType && node.attrs.language === "mermaid");

          const insertPositions: number[] = [];

          doc.descendants((node, pos) => {
            if (!needsSpacing(node)) return;

            const $pos = doc.resolve(pos);
            if (!$pos.parent.type.contentMatch.matchType(paragraphType)) return;

            const before = $pos.nodeBefore;
            if (!before || needsSpacing(before)) {
              insertPositions.push(pos);
            }

            const endPos = pos + node.nodeSize;
            if (!doc.resolve(endPos).nodeAfter) {
              insertPositions.push(endPos);
            }
          });

          if (insertPositions.length === 0) return null;

          const tr = newState.tr;
          insertPositions
            .sort((a, b) => b - a)
            .forEach((pos) => tr.insert(pos, paragraphType.create()));

          return tr;
        },
      }),
    ];
  },
});
