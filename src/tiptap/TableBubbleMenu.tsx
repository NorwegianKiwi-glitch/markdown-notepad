import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import "./TableBubbleMenu.css";

export function TableBubbleMenu({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu editor={editor} pluginKey="tableBubbleMenu" shouldShow={({ editor }) => editor.isActive("table")}>
      <div className="table-bubble-menu">
        <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()}>
          + Col ←
        </button>
        <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>
          + Col →
        </button>
        <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>
          − Col
        </button>
        <span className="table-bubble-divider" />
        <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()}>
          + Row ↑
        </button>
        <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>
          + Row ↓
        </button>
        <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>
          − Row
        </button>
        <span className="table-bubble-divider" />
        <button type="button" className="danger" onClick={() => editor.chain().focus().deleteTable().run()}>
          Delete table
        </button>
      </div>
    </BubbleMenu>
  );
}
