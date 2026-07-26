import { useEffect, useRef, useState } from "react";
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
import { WikiLink } from "../tiptap/wikiLink/WikiLink";
import { TableBubbleMenu } from "../tiptap/TableBubbleMenu";
import { BlockSpacing } from "../tiptap/extensions/BlockSpacing";
import { ImagePaste } from "../tiptap/extensions/ImagePaste";
import { SpellCheck } from "../tiptap/extensions/SpellCheck";
import { NoteDirProvider } from "../tiptap/NoteDirContext";
import { ResizeHandle } from "./ResizeHandle";
import { useResizableWidth } from "../hooks/useResizableWidth";
import "../tiptap/tiptap.css";
import "./Editor.css";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  noteDir: string | null;
  noteNames: string[];
  onNavigateToNote: (name: string) => void;
  spellcheckEnabled: boolean;
}

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

const markedInstance = createMarkedInstance();

function getMarkdown(editor: TiptapEditor): string {
  return (editor as unknown as { getMarkdown: () => string }).getMarkdown();
}

function getHeadings(editor: TiptapEditor): HeadingItem[] {
  const headings: HeadingItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      headings.push({ level: node.attrs.level as number, text: node.textContent, pos });
    }
  });
  return headings;
}

export function Editor({
  value,
  onChange,
  noteDir,
  noteNames,
  onNavigateToNote,
  spellcheckEnabled,
}: EditorProps) {
  const lastEmitted = useRef(value);
  const noteDirRef = useRef(noteDir);
  noteDirRef.current = noteDir;
  const noteNamesRef = useRef(noteNames);
  noteNamesRef.current = noteNames;
  const onNavigateToNoteRef = useRef(onNavigateToNote);
  onNavigateToNoteRef.current = onNavigateToNote;
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const outlineResize = useResizableWidth({
    defaultWidth: 200,
    minWidth: 160,
    maxWidth: 480,
    storageKey: "outlineWidth",
    side: "right",
  });

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
      WikiLink.configure({
        getNoteNames: () => noteNamesRef.current,
        onNavigate: (target) => onNavigateToNoteRef.current(target),
      }),
      BlockSpacing,
      ...(spellcheckEnabled ? [SpellCheck] : []),
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
      setHeadings(getHeadings(editor));
    },
  });

  useEffect(() => {
    if (!editor) return;
    setHeadings(getHeadings(editor));
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(value, { contentType: "markdown" });
      setHeadings(getHeadings(editor));
    }
  }, [value, editor]);

  function jumpToHeading(pos: number) {
    if (!editor) return;
    editor.commands.focus(pos);
    const domNode = editor.view.domAtPos(pos).node;
    const el = domNode.nodeType === 1 ? (domNode as HTMLElement) : domNode.parentElement;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="editor-pane">
      {editor && <TableBubbleMenu editor={editor} />}
      <div className="editor-pane-body">
        <NoteDirProvider value={noteDir}>
          <EditorContent editor={editor} className="editor-content" />
        </NoteDirProvider>
        {headings.length > 0 && (
          <>
            <ResizeHandle
              isResizing={outlineResize.isResizing}
              onPointerDown={outlineResize.handlePointerDown}
              collapsed={outlineResize.collapsed}
              onToggleCollapse={outlineResize.toggleCollapsed}
              side="right"
            />
            {!outlineResize.collapsed && (
              <aside className="outline-panel" style={{ width: outlineResize.width }}>
                <div className="outline-title">Outline</div>
                <ul className="outline-list">
                  {headings.map((h, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        className={`outline-item outline-level-${h.level}`}
                        onClick={() => jumpToHeading(h.pos)}
                      >
                        {h.text || "Untitled"}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </>
        )}
      </div>
    </div>
  );
}
