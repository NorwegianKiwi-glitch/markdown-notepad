import { marked, type TokenizerExtension, type RendererExtension } from "marked";
import { wikiLinkExtension } from "./markedWikiLink";

type MathToken = {
  type: "blockMath" | "inlineMath";
  raw: string;
  text: string;
};

const blockMathExtension: TokenizerExtension & RendererExtension = {
  name: "blockMath",
  level: "block",
  start(src) {
    return src.match(/\$\$/)?.index;
  },
  tokenizer(src) {
    const match = /^\$\$\n?([\s\S]+?)\n?\$\$(?:\n|$)/.exec(src);
    if (!match) return undefined;
    return {
      type: "blockMath",
      raw: match[0],
      text: match[1].trim(),
    } satisfies MathToken;
  },
  renderer() {
    return "";
  },
};

const inlineMathExtension: TokenizerExtension & RendererExtension = {
  name: "inlineMath",
  level: "inline",
  start(src) {
    return src.match(/\$/)?.index;
  },
  tokenizer(src) {
    const match = /^\$([^$\n]+?)\$/.exec(src);
    if (!match) return undefined;
    return {
      type: "inlineMath",
      raw: match[0],
      text: match[1].trim(),
    } satisfies MathToken;
  },
  renderer() {
    return "";
  },
};

export function createMarkedInstance(): typeof marked {
  marked.use({ extensions: [blockMathExtension, inlineMathExtension, wikiLinkExtension] });
  return marked;
}
