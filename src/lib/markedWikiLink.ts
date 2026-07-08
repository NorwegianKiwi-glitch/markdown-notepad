import type { TokenizerExtension, RendererExtension } from "marked";

type WikiLinkToken = {
  type: "wikiLink";
  raw: string;
  text: string;
};

export const wikiLinkExtension: TokenizerExtension & RendererExtension = {
  name: "wikiLink",
  level: "inline",
  start(src) {
    return src.match(/\[\[/)?.index;
  },
  tokenizer(src) {
    const match = /^\[\[([^[\]]+)\]\]/.exec(src);
    if (!match) return undefined;
    return {
      type: "wikiLink",
      raw: match[0],
      text: match[1].trim(),
    } satisfies WikiLinkToken;
  },
  renderer() {
    return "";
  },
};
