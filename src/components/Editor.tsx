import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "@tiptap/markdown";
import { createMarkedInstance } from "../lib/markedMath";
import { saveImage } from "../lib/fs";
import { MathInline, MathBlock } from "../tiptap/nodes/MathNode";
import { CodeBlockWithMermaid } from "../tiptap/nodes/MermaidNode";
import { ImageWithNodeView } from "../tiptap/nodes/ImageNode";
import { SlashCommand } from "../tiptap/slashCommand/SlashCommand";
import { TableBubbleMenu } from "../tiptap/TableBubbleMenu";
import { BlockSpacing } from "../tiptap/extensions/BlockSpacing";
import { ImagePaste } from "../tiptap/extensions/ImagePaste";
import { SpellCheck } from "../tiptap/extensions/SpellCheck";
import { NoteDirProvider } from "../tiptap/NoteDirContext";
import "../tiptap/tiptap.css";
import "./Editor.css";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  noteDir: string | null;
}

const markedInstance = createMarkedInstance();

function getMarkdown(editor: TiptapEditor): string {
  return (editor as unknown as { getMarkdown: () => string }).getMarkdown();
}

export function Editor({ value, onChange, noteDir }: EditorProps) {
  const lastEmitted = useRef(value);
  const noteDirRef = useRef(noteDir);
  noteDirRef.current = noteDir;

  async function handleImagePaste(file: File, view: EditorView) {
    const dir = noteDirRef.current;
    if (!dir) return;
    try {
      const relativePath = await saveImage(dir, file);
      const node = view.state.schema.nodes.image.create({ src: relativePath });
      view.dispatch(view.state.tr.replaceSelectionWith(node));
    } catch (err) {
      console.error("Failed to paste image", err);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithMermaid,
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      MathInline,
      MathBlock,
      ImageWithNodeView,
      ImagePaste.configure({ onImagePaste: handleImagePaste }),
      Markdown.configure({ marked: markedInstance }),
      SlashCommand,
      BlockSpacing,
      SpellCheck,
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: {
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = getMarkdown(editor);
      lastEmitted.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(value, { contentType: "markdown" });
    }
  }, [value, editor]);

  return (
    <div className="editor-pane">
      {editor && <TableBubbleMenu editor={editor} />}
      <NoteDirProvider value={noteDir}>
        <EditorContent editor={editor} className="editor-content" />
      </NoteDirProvider>
    </div>
  );
}
