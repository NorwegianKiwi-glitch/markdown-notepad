import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { WikiLinkNodeView } from "./WikiLinkNodeView";
import {
  WikiLinkSuggestionList,
  type WikiLinkSuggestionListRef,
  type WikiLinkSuggestionItem,
} from "./WikiLinkSuggestionList";

export interface WikiLinkOptions {
  getNoteNames: () => string[];
  onNavigate: (target: string) => void;
}

interface WikiLinkToken {
  text?: string;
}

interface WikiLinkNodeJson {
  attrs?: { target?: string };
}

function getSuggestionItems(query: string, getNoteNames: () => string[]): WikiLinkSuggestionItem[] {
  const q = query.trim();
  const ql = q.toLowerCase();
  const names = getNoteNames();
  const matches = ql ? names.filter((n) => n.toLowerCase().includes(ql)) : names;
  const unique = Array.from(new Set(matches)).slice(0, 9);
  const items: WikiLinkSuggestionItem[] = unique.map((name) => ({ name, isNew: false }));
  if (q && !unique.some((n) => n.toLowerCase() === ql)) {
    items.push({ name: q, isNew: true });
  }
  return items.slice(0, 10);
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      getNoteNames: () => [],
      onNavigate: () => {},
    };
  },

  addAttributes() {
    return {
      target: { default: "" },
    };
  },

  markdownTokenName: "wikiLink",
  parseMarkdown: (token: WikiLinkToken) => ({
    type: "wikiLink",
    attrs: { target: token.text ?? "" },
  }),
  renderMarkdown: (node: WikiLinkNodeJson) => `[[${node.attrs?.target ?? ""}]]`,

  parseHTML() {
    return [{ tag: "span[data-wiki-link]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-wiki-link": "", "data-target": node.attrs.target }),
      node.attrs.target,
    ];
  },

  addNodeView() {
    const { onNavigate } = this.options;
    return ReactNodeViewRenderer((props) => <WikiLinkNodeView {...props} onNavigate={onNavigate} />);
  },

  addProseMirrorPlugins() {
    const { getNoteNames } = this.options;

    return [
      Suggestion<WikiLinkSuggestionItem>({
        editor: this.editor,
        pluginKey: new PluginKey("wikiLinkSuggestion"),
        char: "[[",
        allowSpaces: true,
        items: ({ query }) => getSuggestionItems(query, getNoteNames),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({ type: "wikiLink", attrs: { target: props.name } })
            .insertContent(" ")
            .run();
        },
        render: () => {
          let component: ReactRenderer<WikiLinkSuggestionListRef>;
          let popup: TippyInstance[];

          return {
            onStart: (props) => {
              component = new ReactRenderer(WikiLinkSuggestionList, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: () => props.clientRect!() as DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate(props) {
              component.updateProps({ items: props.items, command: props.command });
              if (!props.clientRect) return;
              popup[0]?.setProps({ getReferenceClientRect: () => props.clientRect!() as DOMRect });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
              popup[0]?.destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
