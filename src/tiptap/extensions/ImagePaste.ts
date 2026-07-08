import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export interface ImagePasteOptions {
  onImagePaste: (file: File, view: EditorView) => void;
}

export const ImagePaste = Extension.create<ImagePasteOptions>({
  name: "imagePaste",

  addOptions() {
    return {
      onImagePaste: () => {},
    };
  },

  addProseMirrorPlugins() {
    const { onImagePaste } = this.options;

    return [
      new Plugin({
        key: new PluginKey("imagePaste"),
        props: {
          handlePaste(view, event) {
            const items = Array.from(event.clipboardData?.items ?? []);
            const imageItem = items.find((item) => item.type.startsWith("image/"));
            if (!imageItem) return false;

            const file = imageItem.getAsFile();
            if (!file) return false;

            event.preventDefault();
            onImagePaste(file, view);
            return true;
          },
        },
      }),
    ];
  },
});
