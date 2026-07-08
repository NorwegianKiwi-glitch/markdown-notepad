import { useEffect, useState, type ReactNode } from "react";
import { readNote, flattenFiles, type FileNode } from "../lib/fs";
import "./Search.css";

interface SearchProps {
  tree: FileNode[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  children: ReactNode;
}

interface SearchResult {
  path: string;
  name: string;
  matchedName: boolean;
  snippet?: string;
}

function makeSnippet(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query);
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 40);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return prefix + content.slice(start, end).replace(/\s+/g, " ").trim() + suffix;
}

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function Search({ tree, activeFile, onSelectFile, children }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    const needle = trimmed.toLowerCase();
    if (!needle) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      const files = flattenFiles(tree);
      const matches = await Promise.all(
        files.map(async (file): Promise<SearchResult | null> => {
          const matchedName = file.name.toLowerCase().includes(needle);
          let snippet: string | undefined;
          try {
            const content = await readNote(file.path);
            if (content.toLowerCase().includes(needle)) {
              snippet = makeSnippet(content, needle);
            }
          } catch {
            // unreadable file, fall back to name-only match
          }
          return matchedName || snippet ? { path: file.path, name: file.name, matchedName, snippet } : null;
        }),
      );

      if (cancelled) return;
      setResults(matches.filter((m): m is SearchResult => m !== null));
      setIsSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [trimmed, tree]);

  return (
    <div className="search-panel">
      <input
        type="text"
        className="search-input"
        placeholder="Search notes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {trimmed ? (
        <div className="search-results">
          {isSearching ? (
            <p className="search-status">Searching…</p>
          ) : results.length === 0 ? (
            <p className="search-status">No matches</p>
          ) : (
            results.map((result) => (
              <button
                key={result.path}
                type="button"
                className={result.path === activeFile ? "search-result active" : "search-result"}
                onClick={() => onSelectFile(result.path)}
              >
                <span className="search-result-name">{highlight(result.name, trimmed)}</span>
                {result.snippet && (
                  <span className="search-result-snippet">{highlight(result.snippet, trimmed)}</span>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
