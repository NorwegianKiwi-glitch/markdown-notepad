import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  addToDictionary,
  isMisspelled,
  isSpellcheckReady,
  loadSpellcheckDictionaries,
  suggest,
} from "../../lib/spellcheck";
import { SpellSuggestions } from "./SpellSuggestions";

const WORD_RE = /[\p{L}'’-]+/gu;
const DEBOUNCE_MS = 400;

const spellcheckKey = new PluginKey<DecorationSet>("spellcheck");

function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock") return false;
    if (!node.isText || !node.text) return;

    for (const match of node.text.matchAll(WORD_RE)) {
      const word = match[0];
      if (word.length < 2 || !isMisspelled(word)) continue;

      const from = pos + (match.index ?? 0);
      const to = from + word.length;
      const suggestions = suggest(word);
      decorations.push(
        Decoration.inline(from, to, {
          class: "spelling-error",
          title: suggestions.length ? `Did you mean: ${suggestions.join(", ")}?` : "Unrecognized word",
        }),
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const SpellCheck = Extension.create({
  name: "spellCheck",

  addProseMirrorPlugins() {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let popup: TippyInstance[] | null = null;
    let component: ReactRenderer | null = null;
    let outsideClickHandler: ((event: MouseEvent) => void) | null = null;
    const editor = this.editor;

    function closePopup() {
      if (outsideClickHandler) {
        document.removeEventListener("mousedown", outsideClickHandler);
        outsideClickHandler = null;
      }
      popup?.[0]?.destroy();
      popup = null;
      component?.destroy();
      component = null;
    }

    return [
      new Plugin({
        key: spellcheckKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const recomputed = tr.getMeta(spellcheckKey) as DecorationSet | undefined;
            if (recomputed) return recomputed;
            if (tr.docChanged) return old.map(tr.mapping, tr.doc);
            return old;
          },
        },
        props: {
          decorations(state) {
            return spellcheckKey.getState(state);
          },
          handleClick(view, pos) {
            const decorationSet = spellcheckKey.getState(view.state);
            const decoration = decorationSet?.find(pos, pos)[0];

            if (!decoration) {
              closePopup();
              return false;
            }

            const { from, to } = decoration;
            const word = view.state.doc.textBetween(from, to);
            const suggestions = suggest(word);

            closePopup();

            component = new ReactRenderer(SpellSuggestions, {
              props: {
                word,
                suggestions,
                onSelect: (replacement: string) => {
                  view.dispatch(view.state.tr.insertText(replacement, from, to));
                  closePopup();
                  view.focus();
                },
                onAddToDictionary: () => {
                  addToDictionary(word);
                  view.dispatch(view.state.tr.setMeta(spellcheckKey, buildDecorations(view.state.doc)));
                  closePopup();
                  view.focus();
                },
              },
              editor,
            });

            popup = tippy("body", {
              getReferenceClientRect: () => {
                const start = view.coordsAtPos(from);
                const end = view.coordsAtPos(to);
                return new DOMRect(start.left, start.top, end.right - start.left, start.bottom - start.top);
              },
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });

            outsideClickHandler = (event: MouseEvent) => {
              if (component?.element.contains(event.target as Node)) return;
              closePopup();
            };
            setTimeout(() => {
              if (outsideClickHandler) document.addEventListener("mousedown", outsideClickHandler);
            }, 0);

            return true;
          },
        },
        view(view) {
          function scheduleRecheck() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              if (!isSpellcheckReady()) return;
              const decorations = buildDecorations(view.state.doc);
              view.dispatch(view.state.tr.setMeta(spellcheckKey, decorations));
            }, DEBOUNCE_MS);
          }

          loadSpellcheckDictionaries().then(scheduleRecheck);
          scheduleRecheck();

          return {
            update(_view, prevState) {
              if (!prevState.doc.eq(view.state.doc)) {
                scheduleRecheck();
                closePopup();
              }
            },
            destroy() {
              clearTimeout(debounceTimer);
              closePopup();
            },
          };
        },
      }),
    ];
  },
});
