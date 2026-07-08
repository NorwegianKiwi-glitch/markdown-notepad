import type { Editor, Range } from "@tiptap/core";

export interface SlashCommandItem {
  title: string;
  description: string;
  keywords: string[];
  command: (props: { editor: Editor; range: Range }) => void;
}

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Big section heading",
    keywords: ["h1", "heading", "title"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    keywords: ["h2", "heading", "subtitle"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    keywords: ["h3", "heading"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    description: "Simple bulleted list",
    keywords: ["ul", "bullet", "list"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "List with numbering",
    keywords: ["ol", "ordered", "numbered", "list"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    description: "Checklist with checkboxes",
    keywords: ["todo", "task", "checkbox", "list"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    description: "Capture a quote",
    keywords: ["quote", "blockquote"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Fenced code block",
    keywords: ["code", "codeblock", "pre"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Mermaid diagram",
    description: "Flowchart, sequence, and more",
    keywords: ["diagram", "mermaid", "flowchart", "chart"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock({ language: "mermaid" })
        .insertContent("flowchart TD\n    A[Start] --> B[End]")
        .run(),
  },
  {
    title: "Table",
    description: "Insert a 3x3 table",
    keywords: ["table", "grid"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Link",
    description: "Insert a hyperlink",
    keywords: ["link", "url", "href"],
    command: ({ editor, range }) => {
      const url = window.prompt("URL:");
      const chain = editor.chain().focus().deleteRange(range);
      if (!url) {
        chain.run();
        return;
      }
      chain.insertContent(`<a href="${url}">${url}</a>`).run();
    },
  },
  {
    title: "Inline math",
    description: "Inline LaTeX formula",
    keywords: ["math", "latex", "formula", "inline"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertInlineMath().run(),
  },
  {
    title: "Block math",
    description: "Standalone LaTeX formula",
    keywords: ["math", "latex", "formula", "equation"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertBlockMath().run(),
  },
  {
    title: "Horizontal rule",
    description: "Divider line",
    keywords: ["hr", "divider", "rule", "line"],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export function filterSlashCommandItems(query: string): SlashCommandItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_COMMAND_ITEMS.slice(0, 10);
  return SLASH_COMMAND_ITEMS.filter(
    (item) => item.title.toLowerCase().startsWith(q) || item.keywords.some((k) => k.startsWith(q)),
  ).slice(0, 10);
}
