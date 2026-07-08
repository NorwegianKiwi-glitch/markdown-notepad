declare module "nspell" {
  interface DictionarySource {
    aff: Uint8Array | ArrayBuffer | string;
    dic: Uint8Array | ArrayBuffer | string;
  }

  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string, model?: string): NSpell;
    remove(word: string): NSpell;
  }

  function nspell(source: DictionarySource | DictionarySource[]): NSpell;

  export default nspell;
}
