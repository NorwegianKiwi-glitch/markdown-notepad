import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MathNodeView } from "./MathNodeView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    math: {
      insertInlineMath: () => ReturnType;
      insertBlockMath: () => ReturnType;
    };
  }
}

interface MathToken {
  text?: string;
}

interface MathNodeJson {
  attrs?: { formula?: string };
}

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      formula: { default: "" },
    };
  },

  markdownTokenName: "inlineMath",
  parseMarkdown: (token: MathToken) => ({
    type: "mathInline",
    attrs: { formula: token.text ?? "" },
  }),
  renderMarkdown: (node: MathNodeJson) => `$${node.attrs?.formula ?? ""}$`,

  parseHTML() {
    return [{ tag: "span[data-math-inline]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-math-inline": "", "data-formula": node.attrs.formula }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props) => <MathNodeView {...props} display="inline" />);
  },
  addCommands() {
    return {
      insertInlineMath:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "mathInline", attrs: { formula: "" } }),
    };
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      formula: { default: "" },
    };
  },

  markdownTokenName: "blockMath",
  parseMarkdown: (token: MathToken) => ({
    type: "mathBlock",
    attrs: { formula: token.text ?? "" },
  }),
  renderMarkdown: (node: MathNodeJson) => `$$\n${node.attrs?.formula ?? ""}\n$$\n\n`,

  parseHTML() {
    return [{ tag: "div[data-math-block]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-math-block": "", "data-formula": node.attrs.formula }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props) => <MathNodeView {...props} display="block" />);
  },
  addCommands() {
    return {
      insertBlockMath:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: "mathBlock", attrs: { formula: "" } }),
    };
  },
});
