import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import { PlainTextEditor } from "./components/PlainTextEditor";
import { QuickSwitcher } from "./components/QuickSwitcher";
import { ResizeHandle } from "./components/ResizeHandle";
import { useResizableWidth } from "./hooks/useResizableWidth";
import {
  pickDirectory,
  pathExists,
  readMarkdownTree,
  readNote,
  writeNote,
  createNote,
  createFolder,
  createLectureNote,
  deleteEntry,
  moveEntry,
  renameEntry,
  buildTagIndex,
  extractTags,
  flattenFiles,
  basename,
  dirname,
  noteTitle,
  isPlainTextFile,
  type FileNode,
} from "./lib/fs";
import "./App.css";

const AUTOSAVE_DELAY_MS = 1500;

const LAST_FOLDER_KEY = "lastOpenedFolder";
const LAST_FILE_KEY = "lastOpenedFile";
const SPELLCHECK_KEY = "spellcheckEnabled";

function isPathInside(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent + "\\") || child.startsWith(parent + "/");
}

function App() {
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tagsByFile, setTagsByFile] = useState<Record<string, string[]>>({});
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  // Off by default: nspell has to parse ~6MB of English + Norwegian dictionary
  // data into memory the first time it loads, so notes that don't need it
  // shouldn't pay for it unasked.
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(
    () => localStorage.getItem(SPELLCHECK_KEY) === "true",
  );

  function toggleSpellcheck() {
    setSpellcheckEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SPELLCHECK_KEY, String(next));
      return next;
    });
  }

  const sidebarResize = useResizableWidth({
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 480,
    storageKey: "sidebarWidth",
    side: "left",
  });

  const isDirty = activeFile !== null && content !== savedContent;

  const noteNames = useMemo(
    () => Array.from(new Set(flattenFiles(tree).map((f) => noteTitle(f.name)))),
    [tree],
  );

  const activeFileRef = useRef(activeFile);
  const contentRef = useRef(content);
  const savedContentRef = useRef(savedContent);
  activeFileRef.current = activeFile;
  contentRef.current = content;
  savedContentRef.current = savedContent;

  const handleSave = useCallback(async () => {
    const path = activeFileRef.current;
    if (!path || contentRef.current === savedContentRef.current) return;
    try {
      await writeNote(path, contentRef.current);
      setSavedContent(contentRef.current);
      setTagsByFile((prev) => ({ ...prev, [path]: extractTags(contentRef.current) }));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setQuickSwitcherOpen((prev) => !prev);
      }
      // Alt+Left / Alt+Right mirror browser-style back/forward navigation.
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
      }
    }
    // Side buttons on mice/trackballs (typically "Back"/"Forward") report as
    // MouseEvent.button 3/4. These fire as a normal "mouseup", no OS-level
    // hook needed, at least on Windows/WebView2.
    function handleMouseUp(e: MouseEvent) {
      if (e.button === 3) {
        e.preventDefault();
        goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        goForward();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleSave, backStack, forwardStack, activeFile]);

  // Autosave: flush edits to disk shortly after typing stops, so lecture notes
  // survive an abrupt window close without needing an explicit Ctrl+S.
  useEffect(() => {
    if (!isDirty) return;
    const timeout = setTimeout(handleSave, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [content, isDirty, handleSave]);

  const loadFolder = useCallback(async (dir: string) => {
    const nodes = await readMarkdownTree(dir);
    setRootDir(dir);
    setTree(nodes);
    setSelectedFolder(dir);
    setActiveFile(null);
    setBackStack([]);
    setForwardStack([]);
    setContent("");
    setSavedContent("");
    setErrorMessage(null);
    localStorage.setItem(LAST_FOLDER_KEY, dir);
    setTagsByFile(await buildTagIndex(nodes));
  }, []);

  const openFile = useCallback(async (path: string) => {
    const text = await readNote(path);
    setActiveFile(path);
    setContent(text);
    setSavedContent(text);
    setErrorMessage(null);
    localStorage.setItem(LAST_FILE_KEY, path);
  }, []);

  // On startup, reopen the folder and file from the previous session if they still exist.
  useEffect(() => {
    const savedFolder = localStorage.getItem(LAST_FOLDER_KEY);
    if (!savedFolder) return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await pathExists(savedFolder)) || cancelled) return;
        await loadFolder(savedFolder);

        const savedFile = localStorage.getItem(LAST_FILE_KEY);
        if (
          savedFile &&
          isPathInside(savedFile, savedFolder) &&
          (await pathExists(savedFile)) &&
          !cancelled
        ) {
          await openFile(savedFile);
        }
      } catch {
        localStorage.removeItem(LAST_FOLDER_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFolder, openFile]);

  async function handleOpenFolder() {
    try {
      const dir = await pickDirectory();
      if (!dir) return;
      await loadFolder(dir);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSelectFile(path: string, options?: { recordHistory?: boolean }) {
    const recordHistory = options?.recordHistory ?? true;
    if (isDirty) await handleSave();
    if (recordHistory && activeFile && activeFile !== path) {
      setBackStack((prev) => [...prev, activeFile]);
      setForwardStack([]);
    }
    try {
      await openFile(path);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function goBack() {
    if (backStack.length === 0 || !activeFile) return;
    const target = backStack[backStack.length - 1];
    setBackStack(backStack.slice(0, -1));
    setForwardStack([...forwardStack, activeFile]);
    await handleSelectFile(target, { recordHistory: false });
  }

  async function goForward() {
    if (forwardStack.length === 0 || !activeFile) return;
    const target = forwardStack[forwardStack.length - 1];
    setForwardStack(forwardStack.slice(0, -1));
    setBackStack([...backStack, activeFile]);
    await handleSelectFile(target, { recordHistory: false });
  }

  // Re-reads the tree and its tag index after a create/delete/move/rename.
  const refreshTree = useCallback(async () => {
    if (!rootDir) return;
    const nodes = await readMarkdownTree(rootDir);
    setTree(nodes);
    setTagsByFile(await buildTagIndex(nodes));
  }, [rootDir]);

  async function handleNewFile() {
    const targetDir = selectedFolder ?? rootDir;
    if (!rootDir || !targetDir) return;
    const name = window.prompt("File name:");
    if (!name) return;
    try {
      const path = await createNote(targetDir, name);
      await refreshTree();
      await handleSelectFile(path);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleNewLectureNote() {
    const targetDir = selectedFolder ?? rootDir;
    if (!rootDir || !targetDir) return;
    const topic = window.prompt("Course or topic:");
    if (topic === null) return;
    try {
      const path = await createLectureNote(targetDir, topic);
      await refreshTree();
      await handleSelectFile(path);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleNewFolder() {
    const targetDir = selectedFolder ?? rootDir;
    if (!rootDir || !targetDir) return;
    const name = window.prompt("Folder name:");
    if (!name) return;
    try {
      const path = await createFolder(targetDir, name);
      await refreshTree();
      setSelectedFolder(path);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  function handleSelectFolder(path: string) {
    setSelectedFolder(path);
  }

  async function handleDelete(path: string, _isDirectory: boolean) {
    if (!rootDir) return;
    try {
      await deleteEntry(path);
      await refreshTree();
      // Clear editor/selection state that pointed at (or inside) the deleted entry.
      const isUnder = (p: string) => p === path || p.startsWith(path + "\\") || p.startsWith(path + "/");
      if (activeFile && isUnder(activeFile)) {
        setActiveFile(null);
        setContent("");
        setSavedContent("");
        localStorage.removeItem(LAST_FILE_KEY);
      }
      if (selectedFolder && isUnder(selectedFolder)) {
        setSelectedFolder(rootDir);
      }
      setBackStack((prev) => prev.filter((p) => !isUnder(p)));
      setForwardStack((prev) => prev.filter((p) => !isUnder(p)));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleMoveEntry(sourcePath: string, destDir: string) {
    if (!rootDir) return;
    if (isPathInside(destDir, sourcePath)) {
      setErrorMessage("Can't move a folder into itself.");
      return;
    }
    try {
      const newPath = await moveEntry(sourcePath, destDir);
      if (newPath === sourcePath) return;
      await refreshTree();
      // Re-point any state that referenced the old path (or something inside it).
      if (activeFile && isPathInside(activeFile, sourcePath)) {
        const updated = newPath + activeFile.slice(sourcePath.length);
        setActiveFile(updated);
        localStorage.setItem(LAST_FILE_KEY, updated);
      }
      if (selectedFolder && isPathInside(selectedFolder, sourcePath)) {
        setSelectedFolder(newPath + selectedFolder.slice(sourcePath.length));
      }
      const rewrite = (p: string) => (isPathInside(p, sourcePath) ? newPath + p.slice(sourcePath.length) : p);
      setBackStack((prev) => prev.map(rewrite));
      setForwardStack((prev) => prev.map(rewrite));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRename(path: string, isDirectory: boolean, newName: string) {
    if (!rootDir) return;
    try {
      const newPath = await renameEntry(path, newName, isDirectory);
      if (newPath === path) return;
      await refreshTree();
      // Re-point any state that referenced the old path (or something inside it).
      if (activeFile && isPathInside(activeFile, path)) {
        const updated = newPath + activeFile.slice(path.length);
        setActiveFile(updated);
        localStorage.setItem(LAST_FILE_KEY, updated);
      }
      if (selectedFolder && isPathInside(selectedFolder, path)) {
        setSelectedFolder(newPath + selectedFolder.slice(path.length));
      }
      const rewrite = (p: string) => (isPathInside(p, path) ? newPath + p.slice(path.length) : p);
      setBackStack((prev) => prev.map(rewrite));
      setForwardStack((prev) => prev.map(rewrite));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  // Wiki-link navigation: jump to a note by title, or create it (next to the
  // current note, or at the root) if no note with that title exists yet.
  async function handleNavigateToNote(name: string) {
    if (!rootDir) return;
    const match = flattenFiles(tree).find((f) => noteTitle(f.name).toLowerCase() === name.toLowerCase());
    if (match) {
      await handleSelectFile(match.path);
      return;
    }
    const targetDir = (activeFile && dirname(activeFile)) || rootDir;
    try {
      const path = await createNote(targetDir, name);
      await refreshTree();
      await handleSelectFile(path);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="app-shell">
      {!sidebarResize.collapsed && (
        <Sidebar
          width={sidebarResize.width}
          rootDir={rootDir}
          tree={tree}
          activeFile={activeFile}
          selectedFolder={selectedFolder}
          onOpenFolder={handleOpenFolder}
          onSelectFile={handleSelectFile}
          onSelectFolder={handleSelectFolder}
          onNewFile={handleNewFile}
          onNewLectureNote={handleNewLectureNote}
          onNewFolder={handleNewFolder}
          onDelete={handleDelete}
          onMoveEntry={handleMoveEntry}
          onRename={handleRename}
          tagsByFile={tagsByFile}
        />
      )}
      <ResizeHandle
        isResizing={sidebarResize.isResizing}
        onPointerDown={sidebarResize.handlePointerDown}
        collapsed={sidebarResize.collapsed}
        onToggleCollapse={sidebarResize.toggleCollapsed}
        side="left"
      />
      <div className="workspace">
        <div className="workspace-header">
          <div className="nav-buttons">
            <button
              type="button"
              className="nav-button"
              onClick={goBack}
              disabled={backStack.length === 0}
              title="Back (Alt+Left)"
              aria-label="Back"
            >
              ←
            </button>
            <button
              type="button"
              className="nav-button"
              onClick={goForward}
              disabled={forwardStack.length === 0}
              title="Forward (Alt+Right)"
              aria-label="Forward"
            >
              →
            </button>
          </div>
          <span className="file-name">
            {activeFile ? basename(activeFile) : "No file open"}
            {isDirty && <span className="dirty-dot" title="Unsaved changes" />}
          </span>
          <div className="header-actions">
            <label className="spellcheck-toggle">
              <input type="checkbox" checked={spellcheckEnabled} onChange={toggleSpellcheck} />
              Spellcheck
            </label>
            <button type="button" onClick={handleSave} disabled={!activeFile || !isDirty}>
              Save
            </button>
          </div>
        </div>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <div className="panes">
          {activeFile ? (
            isPlainTextFile(activeFile) ? (
              <PlainTextEditor value={content} onChange={setContent} />
            ) : (
              <Editor
                key={spellcheckEnabled ? "spellcheck-on" : "spellcheck-off"}
                value={content}
                onChange={setContent}
                noteDir={dirname(activeFile)}
                noteNames={noteNames}
                onNavigateToNote={handleNavigateToNote}
                spellcheckEnabled={spellcheckEnabled}
              />
            )
          ) : (
            <div className="empty-state">Open a folder and select a file to start writing.</div>
          )}
        </div>
      </div>
      {quickSwitcherOpen && (
        <QuickSwitcher
          tree={tree}
          rootDir={rootDir}
          onSelectFile={(path) => {
            setQuickSwitcherOpen(false);
            handleSelectFile(path);
          }}
          onClose={() => setQuickSwitcherOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
