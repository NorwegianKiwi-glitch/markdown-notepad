import "./PlainTextEditor.css";

interface PlainTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Plain-text files are edited verbatim in a textarea rather than through the
// Tiptap/markdown pipeline, so characters like #, *, _ aren't reinterpreted
// as markdown syntax and round-tripped back out mangled.
export function PlainTextEditor({ value, onChange }: PlainTextEditorProps) {
  return (
    <div className="plain-text-editor">
      <textarea
        className="plain-text-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}
