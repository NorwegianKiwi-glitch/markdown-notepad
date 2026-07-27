import { useEffect, useMemo, useRef, useState } from "react";
import type { TemplateInfo } from "../lib/fs";
import "./TemplatePicker.css";

interface TemplatePickerProps {
  templates: TemplateInfo[];
  onPick: (template: TemplateInfo) => void;
  onClose: () => void;
}

export function TemplatePicker({ templates, onPick, onClose }: TemplatePickerProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? templates.filter((t) => t.name.toLowerCase().includes(q)) : templates;
  }, [templates, query]);

  useEffect(() => setSelectedIndex(0), [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function pick(index: number) {
    const template = results[index];
    if (template) onPick(template);
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
      pick(selectedIndex);
    }
  }

  return (
    <div className="template-picker-backdrop" onClick={onClose}>
      <div className="template-picker" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="template-picker-input"
          placeholder="Choose a template…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="template-picker-results">
          {results.length === 0 ? (
            <p className="template-picker-empty">No matching templates</p>
          ) : (
            results.map((template, index) => (
              <button
                type="button"
                key={template.path}
                className={index === selectedIndex ? "template-picker-item selected" : "template-picker-item"}
                onClick={() => pick(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {template.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
