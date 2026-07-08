import { useEffect, useState } from "react";
import { basename, type FileNode } from "../lib/fs";
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
  rootDir: string | null;
  tree: FileNode[];
  activeFile: string | null;
  selectedFolder: string | null;
  onOpenFolder: () => void;
  onSelectFile: (path: string) => void;
  onSelectFolder: (path: string) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onDelete: (path: string, isDirectory: boolean) => void;
}

export function Sidebar({
  rootDir,
  tree,
  activeFile,
  selectedFolder,
  onOpenFolder,
  onSelectFile,
  onSelectFolder,
  onNewFile,
  onNewFolder,
  onDelete,
}: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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

  return (
    <aside className="sidebar">
      <div className="sidebar-actions">
        <button type="button" onClick={onOpenFolder}>Open Folder…</button>
        <button type="button" onClick={onNewFile} disabled={!rootDir}>New File</button>
        <button type="button" onClick={onNewFolder} disabled={!rootDir}>New Folder</button>
      </div>
      {rootDir ? (
        <Search tree={tree} activeFile={activeFile} onSelectFile={onSelectFile}>
          <div className="sidebar-tree">
            <button
              type="button"
              className={selectedFolder === rootDir ? "root-folder active" : "root-folder"}
              onClick={() => onSelectFolder(rootDir)}
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
            />
          </div>
        </Search>
      ) : (
        <p className="sidebar-empty">Open a folder to get started.</p>
      )}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button type="button" className="context-menu-item danger" onClick={handleDelete}>
            Delete {contextMenu.isDirectory ? "folder" : "file"}
          </button>
        </div>
      )}
    </aside>
  );
}

interface FileTreeProps {
  nodes: FileNode[];
  activeFile: string | null;
  selectedFolder: string | null;
  onSelectFile: (path: string) => void;
  onSelectFolder: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void;
}

function FileTree({ nodes, activeFile, selectedFolder, onSelectFile, onSelectFolder, onContextMenu }: FileTreeProps) {
  return (
    <ul className="file-tree">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.isDirectory ? (
            <details open>
              <summary
                className={node.path === selectedFolder ? "folder-entry active" : "folder-entry"}
                onClick={() => onSelectFolder(node.path)}
                onContextMenu={(e) => onContextMenu(e, node)}
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
                />
              )}
            </details>
          ) : (
            <button
              type="button"
              className={node.path === activeFile ? "file-entry active" : "file-entry"}
              onClick={() => onSelectFile(node.path)}
              onContextMenu={(e) => onContextMenu(e, node)}
            >
              {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
