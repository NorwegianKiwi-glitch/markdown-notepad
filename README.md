# Inkay

Inkay is a fast, local-first markdown notepad for Windows/macOS/Linux, built with
[Tauri](https://tauri.app/) and React. Point it at a folder on disk and that folder
becomes your notebook: every note is a plain `.md` (or `.txt`) file, so there's no
proprietary format, no account, and no sync service standing between you and your
notes.

## Features

**Vault & files**
- Open any folder as a vault; the sidebar shows its file tree (folders like `.git`,
  `node_modules`, `.obsidian`, and `assets` are skipped)
- Create notes, dated lecture notes, and folders from the sidebar
- Rename, delete (to the OS recycle bin/trash, never permanent), and drag-and-drop
  files/folders to reorganize
- Remembers the last folder and note you had open across restarts
- **Custom templates** — write your own reusable note templates (with `{{title}}` /
  `{{date}}` placeholders) for meetings, journaling, or any other recurring occasion,
  then spin up a new note from one whenever you need it

**Writing**
- Rich WYSIWYG markdown editor — what you type is stored as real markdown on disk
- `/` slash commands for headings, lists, task lists, blockquotes, code blocks,
  tables, links, wiki-links, math, horizontal rules, and Mermaid diagrams
- `[[wiki-links]]` with autocomplete against your existing notes; linking to a note
  that doesn't exist yet creates it
- `#tags` anywhere in a note, browsable from a tag list in the sidebar
- Tables with a hover toolbar for adding/removing rows and columns
- Mermaid diagrams and inline/block LaTeX math (via KaTeX) rendered live; click a
  formula to edit its source
- Paste an image straight from the clipboard — it's saved into an `assets/` folder
  next to the note, and can be resized by dragging its corner handle
- Plain `.txt` files open in a bare text editor instead, so their content is never
  reinterpreted as markdown
- Optional spellcheck (English + Norwegian Bokmål)

**Navigating**
- Full-text + filename search
- Quick switcher (`Ctrl/Cmd+P`) to jump to any note by name
- Back/forward history — toolbar buttons, `Alt+Left` / `Alt+Right`, and the
  back/forward side buttons on a mouse all work
- An auto-generated outline of the current note's headings, with click-to-jump
- Resizable, collapsible sidebar and outline panel

**Saving**
- Autosaves ~1.5s after you stop typing, plus explicit `Ctrl/Cmd+S`
- A dot next to the filename shows unsaved changes

## Getting started

Prerequisites: [Node.js](https://nodejs.org/), the [Rust toolchain](https://www.rust-lang.org/tools/install),
and the platform dependencies Tauri needs — see the
[Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS.

```sh
npm install
npm run tauri dev    # run the app in development mode
```

To produce an installable build:

```sh
npm run tauri build
```

### Recommended IDE setup

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## How to use

1. **Open a vault.** Launch Inkay and click **Open Folder…**, then pick (or create)
   a folder for your notes. Inkay will read any `.md`/`.txt` files already in it.
2. **Create notes.**
   - **New File** prompts for a name and creates a note (`.md` by default).
   - **New Lecture Note** prompts for a course/topic and creates a note named
     `YYYY-MM-DD Topic.md`, pre-filled with *Topics Covered*, *Notes*, and
     *Questions / Follow-ups* sections.
   - **New Folder** creates a subfolder to organize notes into.
   - New files/folders are created inside whatever folder is currently selected in
     the sidebar (or at the vault root if none is selected).
3. **Write.** Click a note to open it and start typing — formatting is applied as
   you type, the same as any rich-text editor. Type `/` on its own to bring up the
   slash-command menu for inserting headings, lists, tables, diagrams, math, and
   more without remembering markdown syntax.
4. **Use templates for recurring occasions.** Open the **Templates** section in the
   sidebar and click **+ New Template** to create one — this opens a normal note
   under the hood, so you write it the same way you'd write any other note (slash
   commands, tables, everything). Two placeholders get filled in automatically
   wherever they appear in the template's text: `{{title}}` becomes the name you
   give the new note, and `{{date}}` becomes today's date. For example, a "Meeting"
   template might start with `# {{title}} — {{date}}`.

   Whenever you need one, click **New from Template** in the sidebar, pick the
   template you want, and give the new note a name — Inkay creates it from the
   template with the placeholders already filled in. Right-click a template in the
   list to rename or delete it; clicking it normally opens it for editing so you
   can keep refining it over time. (Templates are stored as regular markdown files
   in a hidden `.templates` folder at the root of your vault, so they travel with
   it and never show up in your note tree, search, or wiki-links.)
5. **Link notes together.** Type `[[` to search for another note by name and
   insert a link to it; picking a name that doesn't exist yet creates that note.
   Clicking a wiki-link jumps straight to it.
6. **Tag notes.** Add `#tagname` anywhere in a note's text. Open the **Tags**
   section in the sidebar to browse all tags in the vault and see which notes use
   a given one.
7. **Find things.**
   - Type into the **Search notes…** box to filter by filename or note content
     (with a highlighted snippet of the match).
   - Press `Ctrl/Cmd+P` to open the quick switcher and jump to a note by name.
   - Use the **←** / **→** buttons (or `Alt+Left` / `Alt+Right`, or your mouse's
     back/forward side buttons) to retrace notes you've recently visited.
8. **Organize.** Drag a file or folder onto another folder in the sidebar to move
   it there. Right-click any entry to rename or delete it (deleted items go to the
   OS recycle bin/trash, not gone for good).
9. **Save.** Inkay autosaves shortly after you stop typing; press `Ctrl/Cmd+S` any
   time to save immediately. A small dot next to the filename means there are
   unsaved changes.

### Keyboard & mouse shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd+S` | Save the current note |
| `Ctrl/Cmd+P` | Open the quick switcher |
| `Alt+Left` / mouse Back button | Go back to the previous note |
| `Alt+Right` / mouse Forward button | Go forward again |
| `/` | Open the slash-command menu |
| `[[` | Open the wiki-link search/insert menu |
| `Escape` | Close the quick switcher / suggestion popups |

## Tech stack

Inkay is a [Tauri v2](https://tauri.app/) app: a Rust backend handles the window,
file system, and dialogs, while the UI is React 19 + TypeScript. Editing is powered
by [Tiptap](https://tiptap.dev/)/ProseMirror with a markdown round-trip, diagrams by
[Mermaid](https://mermaid.js.org/), math by [KaTeX](https://katex.org/), and
spellcheck by [nspell](https://github.com/wooorm/nspell).
