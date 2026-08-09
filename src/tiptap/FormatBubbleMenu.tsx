import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState, type Editor } from "@tiptap/react";
import "./FormatBubbleMenu.css";

export function FormatBubbleMenu({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      paragraph: editor.isActive("paragraph"),
      heading1: editor.isActive("heading", { level: 1 }),
      heading2: editor.isActive("heading", { level: 2 }),
      heading3: editor.isActive("heading", { level: 3 }),
      blockquote: editor.isActive("blockquote"),
      codeBlock: editor.isActive("codeBlock"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="formatBubbleMenu"
      shouldShow={({ editor, state }) => {
        if (state.selection.empty) return false;
        if (editor.isActive("table")) return false;
        if (editor.isActive("codeBlock")) return false;
        return true;
      }}
    >
      <div className="format-bubble-menu">
        <button
          type="button"
          className={state.bold ? "active" : ""}
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={state.italic ? "active" : ""}
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={state.strike ? "active" : ""}
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        <button
          type="button"
          className={state.code ? "active" : ""}
          title="Inline code"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          {"</>"}
        </button>
        <span className="format-bubble-divider" />
        <button
          type="button"
          className={state.paragraph ? "active" : ""}
          title="Normal text"
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          P
        </button>
        <button
          type="button"
          className={state.heading1 ? "active" : ""}
          title="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          className={state.heading2 ? "active" : ""}
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={state.heading3 ? "active" : ""}
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <span className="format-bubble-divider" />
        <button
          type="button"
          className={state.blockquote ? "active" : ""}
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          "
        </button>
        <button
          type="button"
          className={state.codeBlock ? "active" : ""}
          title="Code block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {"{ }"}
        </button>
        <button
          type="button"
          className={state.bulletList ? "active" : ""}
          title="Bulleted list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </button>
        <button
          type="button"
          className={state.orderedList ? "active" : ""}
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </button>
      </div>
    </BubbleMenu>
  );
}
