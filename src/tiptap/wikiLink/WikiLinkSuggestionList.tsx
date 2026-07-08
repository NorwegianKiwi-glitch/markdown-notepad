import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import "../slashCommand/SlashCommand.css";

export interface WikiLinkSuggestionItem {
  name: string;
  isNew: boolean;
}

interface WikiLinkSuggestionListProps {
  items: WikiLinkSuggestionItem[];
  command: (item: WikiLinkSuggestionItem) => void;
}

export interface WikiLinkSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const WikiLinkSuggestionList = forwardRef<WikiLinkSuggestionListRef, WikiLinkSuggestionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    function selectItem(index: number) {
      const item = items[index];
      if (item) command(item);
    }

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return <div className="slash-menu slash-menu-empty">No matching notes</div>;
    }

    return (
      <div className="slash-menu">
        {items.map((item, index) => (
          <button
            type="button"
            key={item.name}
            className={index === selectedIndex ? "slash-menu-item selected" : "slash-menu-item"}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="slash-menu-title">{item.isNew ? `Create "${item.name}"` : item.name}</span>
          </button>
        ))}
      </div>
    );
  },
);

WikiLinkSuggestionList.displayName = "WikiLinkSuggestionList";
