import { useEffect, useMemo, useRef, useState } from "react";
import { flattenFiles, dirname, type FileNode } from "../lib/fs";
import "./QuickSwitcher.css";

interface QuickSwitcherProps {
  tree: FileNode[];
  rootDir: string | null;
  onSelectFile: (path: string) => void;
  onClose: () => void;
}

function relativeDir(path: string, rootDir: string | null): string {
  const dir = dirname(path);
  if (!rootDir || dir === rootDir) return "";
  return dir.startsWith(rootDir) ? dir.slice(rootDir.length + 1) : dir;
}

export function QuickSwitcher({ tree, rootDir, onSelectFile, onClose }: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const files = useMemo(() => flattenFiles(tree), [tree]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
    return matches.slice(0, 50);
  }, [files, query]);

  useEffect(() => setSelectedIndex(0), [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function selectResult(index: number) {
    const file = results[index];
    if (file) onSelectFile(file.path);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (results.length ? (prev + results.length - 1) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectResult(selectedIndex);
    }
  }

  return (
    <div className="quick-switcher-backdrop" onClick={onClose}>
      <div className="quick-switcher" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="quick-switcher-input"
          placeholder="Jump to note…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="quick-switcher-results">
          {results.length === 0 ? (
            <p className="quick-switcher-empty">No matching notes</p>
          ) : (
            results.map((file, index) => (
              <button
                type="button"
                key={file.path}
                className={index === selectedIndex ? "quick-switcher-item selected" : "quick-switcher-item"}
                onClick={() => selectResult(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="quick-switcher-item-name">{file.name}</span>
                {relativeDir(file.path, rootDir) && (
                  <span className="quick-switcher-item-path">{relativeDir(file.path, rootDir)}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
