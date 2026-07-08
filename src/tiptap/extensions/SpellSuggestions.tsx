import "./SpellSuggestions.css";

interface SpellSuggestionsProps {
  word: string;
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  onAddToDictionary: () => void;
}

export function SpellSuggestions({ word, suggestions, onSelect, onAddToDictionary }: SpellSuggestionsProps) {
  return (
    <div className="spell-suggestions">
      {suggestions.length === 0 ? (
        <div className="spell-suggestions-empty">No suggestions</div>
      ) : (
        suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="spell-suggestions-item"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </button>
        ))
      )}
      <div className="spell-suggestions-divider" />
      <button type="button" className="spell-suggestions-add" onClick={onAddToDictionary}>
        Add &quot;{word}&quot; to dictionary
      </button>
    </div>
  );
}
