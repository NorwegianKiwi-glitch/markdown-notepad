import { useEffect, useMemo, useState } from "react";
import { basename, flattenFiles, type FileNode } from "../lib/fs";
import { Search } from "./Search";
import "./Sidebar.css";

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  name: string;
  isDirectory: boolean;
}

interface SidebarProps {
  width: number;
  rootDir: string | null;
  tree: FileNode[];
  activeFile: string | null;
  selectedFolder: string | null;
  onOpenFolder: () => void;
  onSelectFile: (path: string) => void;
  onSelectFolder: (path: string) => void;
  onNewFile: () => void;
  onNewLectureNote: () => void;
  onNewFolder: () => void;
  onDelete: (path: string, isDirectory: boolean) => void;
  onMoveEntry: (sourcePath: string, destDir: string) => void;
  onRename: (path: string, isDirectory: boolean, newName: string) => void;
  tagsByFile: Record<string, string[]>;
}

// True when `path` is `ancestor` itself or lives somewhere underneath it.
function isSameOrInside(path: string, ancestor: string): boolean {
  return path === ancestor || path.startsWith(ancestor + "/") || path.startsWith(ancestor + "\\");
}

export function Sidebar({
  width,
  rootDir,
  tree,
  activeFile,
  selectedFolder,
  onOpenFolder,
  onSelectFile,
  onSelectFolder,
  onNewFile,
  onNewLectureNote,
  onNewFolder,
  onDelete,
  onMoveEntry,
  onRename,
  tagsByFile,
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(tagsByFile).forEach((tags) => tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tagsByFile]);

  const taggedFiles = useMemo(() => {
    if (!activeTag) return [];
    return flattenFiles(tree).filter((f) => tagsByFile[f.path]?.includes(activeTag));
  }, [activeTag, tagsByFile, tree]);

  const canDropOn = (targetDir: string) => !!draggedPath && !isSameOrInside(targetDir, draggedPath);

  function handleDragStart(event: React.DragEvent, path: string) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", path);
    setDraggedPath(path);
  }

  function handleDragEnd() {
    setDraggedPath(null);
    setDragOverPath(null);
  }

  function handleDragEnter(event: React.DragEvent, targetDir: string) {
    event.preventDefault();
    event.stopPropagation();
    if (canDropOn(targetDir)) setDragOverPath(targetDir);
  }

  function handleDragOver(event: React.DragEvent, targetDir: string) {
    if (!canDropOn(targetDir)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDragLeave(event: React.DragEvent, targetDir: string) {
    event.stopPropagation();
    setDragOverPath((prev) => (prev === targetDir ? null : prev));
  }

  function handleDrop(event: React.DragEvent, targetDir: string) {
    event.preventDefault();
    event.stopPropagation();
    const path = draggedPath ?? event.dataTransfer.getData("text/plain");
    setDraggedPath(null);
    setDragOverPath(null);
    if (path && canDropOn(targetDir)) onMoveEntry(path, targetDir);
  }

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", close);
    };
  }, [contextMenu]);

  function handleContextMenu(event: React.MouseEvent, node: FileNode) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, path: node.path, name: node.name, isDirectory: node.isDirectory });
  }

  function handleDelete() {
    if (!contextMenu) return;
    const kind = contextMenu.isDirectory ? "folder (and everything inside it)" : "file";
    const proceed = window.confirm(`Move the ${kind} "${contextMenu.name}" to the recycle bin?`);
    setContextMenu(null);
    if (proceed) {
      onDelete(contextMenu.path, contextMenu.isDirectory);
    }
  }

  function handleRename() {
    if (!contextMenu) return;
    const { path, name, isDirectory } = contextMenu;
    setContextMenu(null);
    const newName = window.prompt(`Rename ${isDirectory ? "folder" : "file"}:`, name);
    if (!newName || newName === name) return;
    onRename(path, isDirectory, newName);
  }

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="sidebar-actions">
        <button type="button" onClick={onOpenFolder}>Open Folder…</button>
        <button type="button" onClick={onNewFile} disabled={!rootDir}>New File</button>
        <button type="button" onClick={onNewLectureNote} disabled={!rootDir}>New Lecture Note</button>
        <button type="button" onClick={onNewFolder} disabled={!rootDir}>New Folder</button>
      </div>
      {rootDir && allTags.length > 0 && (
        <details className="tags-section">
          <summary className="tags-summary">Tags</summary>
          <div className="tag-pills">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={tag === activeTag ? "tag-pill active" : "tag-pill"}
                onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
              >
                #{tag}
              </button>
            ))}
          </div>
          {activeTag && (
            <ul className="tag-file-list">
              {taggedFiles.length === 0 ? (
                <li className="tag-file-empty">No notes tagged #{activeTag}</li>
              ) : (
                taggedFiles.map((f) => (
                  <li key={f.path}>
                    <button type="button" className="tag-file-entry" onClick={() => onSelectFile(f.path)}>
                      {f.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </details>
      )}
      {rootDir ? (
        <Search tree={tree} activeFile={activeFile} onSelectFile={onSelectFile}>
          <div className="sidebar-tree">
            <button
              type="button"
              className={[
                "root-folder",
                selectedFolder === rootDir && "active",
                dragOverPath === rootDir && "drag-over",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectFolder(rootDir)}
              onDragEnter={(e) => handleDragEnter(e, rootDir)}
              onDragOver={(e) => handleDragOver(e, rootDir)}
              onDragLeave={(e) => handleDragLeave(e, rootDir)}
              onDrop={(e) => handleDrop(e, rootDir)}
              title={rootDir}
            >
              {basename(rootDir)}
            </button>
            <FileTree
              nodes={tree}
              activeFile={activeFile}
              selectedFolder={selectedFolder}
              onSelectFile={onSelectFile}
              onSelectFolder={onSelectFolder}
              onContextMenu={handleContextMenu}
              dnd={{
                draggedPath,
                dragOverPath,
                onDragStart: handleDragStart,
                onDragEnd: handleDragEnd,
                onDragEnter: handleDragEnter,
                onDragOver: handleDragOver,
                onDragLeave: handleDragLeave,
                onDrop: handleDrop,
              }}
            />
          </div>
        </Search>
      ) : (
        <p className="sidebar-empty">Open a folder to get started.</p>
      )}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button type="button" className="context-menu-item" onClick={handleRename}>
            Rename {contextMenu.isDirectory ? "folder" : "file"}
          </button>
          <button type="button" className="context-menu-item danger" onClick={handleDelete}>
            Delete {contextMenu.isDirectory ? "folder" : "file"}
          </button>
        </div>
      )}
    </aside>
  );
}

interface DragHandlers {
  draggedPath: string | null;
  dragOverPath: string | null;
  onDragStart: (event: React.DragEvent, path: string) => void;
  onDragEnd: () => void;
  onDragEnter: (event: React.DragEvent, targetDir: string) => void;
  onDragOver: (event: React.DragEvent, targetDir: string) => void;
  onDragLeave: (event: React.DragEvent, targetDir: string) => void;
  onDrop: (event: React.DragEvent, targetDir: string) => void;
}

interface FileTreeProps {
  nodes: FileNode[];
  activeFile: string | null;
  selectedFolder: string | null;
  onSelectFile: (path: string) => void;
  onSelectFolder: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
  dnd: DragHandlers;
}

function FileTree({ nodes, activeFile, selectedFolder, onSelectFile, onSelectFolder, onContextMenu, dnd }: FileTreeProps) {
  return (
    <ul className="file-tree">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.isDirectory ? (
            <details open>
              <summary
                className={[
                  "folder-entry",
                  node.path === selectedFolder && "active",
                  node.path === dnd.draggedPath && "dragging",
                  node.path === dnd.dragOverPath && "drag-over",
                ]
                  .filter(Boolean)
                  .join(" ")}
                draggable
                onClick={() => onSelectFolder(node.path)}
                onContextMenu={(e) => onContextMenu(e, node)}
                onDragStart={(e) => dnd.onDragStart(e, node.path)}
                onDragEnd={dnd.onDragEnd}
                onDragEnter={(e) => dnd.onDragEnter(e, node.path)}
                onDragOver={(e) => dnd.onDragOver(e, node.path)}
                onDragLeave={(e) => dnd.onDragLeave(e, node.path)}
                onDrop={(e) => dnd.onDrop(e, node.path)}
              >
                {node.name}
              </summary>
              {node.children && (
                <FileTree
                  nodes={node.children}
                  activeFile={activeFile}
                  selectedFolder={selectedFolder}
                  onSelectFile={onSelectFile}
                  onSelectFolder={onSelectFolder}
                  onContextMenu={onContextMenu}
                  dnd={dnd}
                />
              )}
            </details>
          ) : (
            <button
              type="button"
              className={[
                "file-entry",
                node.path === activeFile && "active",
                node.path === dnd.draggedPath && "dragging",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable
              onClick={() => onSelectFile(node.path)}
              onContextMenu={(e) => onContextMenu(e, node)}
              onDragStart={(e) => dnd.onDragStart(e, node.path)}
              onDragEnd={dnd.onDragEnd}
            >
              {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
