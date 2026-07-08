import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import {
  pickDirectory,
  pathExists,
  readMarkdownTree,
  readNote,
  writeNote,
  createNote,
  createFolder,
  deleteEntry,
  moveEntry,
  basename,
  dirname,
  type FileNode,
} from "./lib/fs";
import "./App.css";

const LAST_FOLDER_KEY = "lastOpenedFolder";
const LAST_FILE_KEY = "lastOpenedFile";

function isPathInside(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent + "\\") || child.startsWith(parent + "/");
}

function App() {
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDirty = activeFile !== null && content !== savedContent;

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
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const loadFolder = useCallback(async (dir: string) => {
    const nodes = await readMarkdownTree(dir);
    setRootDir(dir);
    setTree(nodes);
    setSelectedFolder(dir);
    setActiveFile(null);
    setContent("");
    setSavedContent("");
    setErrorMessage(null);
    localStorage.setItem(LAST_FOLDER_KEY, dir);
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

  async function handleSelectFile(path: string) {
    if (isDirty) {
      const proceed = window.confirm("You have unsaved changes. Discard them?");
      if (!proceed) return;
    }
    try {
      await openFile(path);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleNewFile() {
    const targetDir = selectedFolder ?? rootDir;
    if (!rootDir || !targetDir) return;
    const name = window.prompt("File name:");
    if (!name) return;
    try {
      const path = await createNote(targetDir, name);
      const nodes = await readMarkdownTree(rootDir);
      setTree(nodes);
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
      const nodes = await readMarkdownTree(rootDir);
      setTree(nodes);
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
      const nodes = await readMarkdownTree(rootDir);
      setTree(nodes);
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
      const nodes = await readMarkdownTree(rootDir);
      setTree(nodes);
      // Re-point any state that referenced the old path (or something inside it).
      if (activeFile && isPathInside(activeFile, sourcePath)) {
        const updated = newPath + activeFile.slice(sourcePath.length);
        setActiveFile(updated);
        localStorage.setItem(LAST_FILE_KEY, updated);
      }
      if (selectedFolder && isPathInside(selectedFolder, sourcePath)) {
        setSelectedFolder(newPath + selectedFolder.slice(sourcePath.length));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        rootDir={rootDir}
        tree={tree}
        activeFile={activeFile}
        selectedFolder={selectedFolder}
        onOpenFolder={handleOpenFolder}
        onSelectFile={handleSelectFile}
        onSelectFolder={handleSelectFolder}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onDelete={handleDelete}
        onMoveEntry={handleMoveEntry}
      />
      <div className="workspace">
        <div className="workspace-header">
          <span className="file-name">
            {activeFile ? basename(activeFile) : "No file open"}
            {isDirty && <span className="dirty-dot" title="Unsaved changes" />}
          </span>
          <button type="button" onClick={handleSave} disabled={!activeFile || !isDirty}>
            Save
          </button>
        </div>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        <div className="panes">
          {activeFile ? (
            <Editor value={content} onChange={setContent} noteDir={dirname(activeFile)} />
          ) : (
            <div className="empty-state">Open a folder and select a file to start writing.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
