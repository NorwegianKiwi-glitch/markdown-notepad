import nspell from "nspell";

type Speller = ReturnType<typeof nspell>;

let englishSpell: Speller | null = null;
let norwegianSpell: Speller | null = null;
let readyPromise: Promise<void> | null = null;

async function loadDictionary(basePath: string): Promise<Speller> {
  // nspell parses aff/dic via `buf.toString('utf8')`, a Node Buffer-specific
  // signature that a plain Uint8Array doesn't support (it ignores the
  // encoding arg and stringifies to byte numbers). Fetching as text decodes
  // it correctly and passes straight through nspell's string handling.
  const [aff, dic] = await Promise.all([
    fetch(`${basePath}/index.aff`).then((res) => res.text()),
    fetch(`${basePath}/index.dic`).then((res) => res.text()),
  ]);
  return nspell({ aff, dic });
}

export function loadSpellcheckDictionaries(): Promise<void> {
  if (!readyPromise) {
    readyPromise = Promise.all([loadDictionary("/dictionaries/en"), loadDictionary("/dictionaries/nb")]).then(
      ([en, nb]) => {
        englishSpell = en;
        norwegianSpell = nb;
      },
    );
  }
  return readyPromise;
}

export function isSpellcheckReady(): boolean {
  return englishSpell !== null && norwegianSpell !== null;
}

export function isMisspelled(word: string): boolean {
  if (!englishSpell || !norwegianSpell) return false;
  const correctIn = (w: string) => englishSpell!.correct(w) || norwegianSpell!.correct(w);
  return !correctIn(word) && !correctIn(word.toLowerCase());
}

export function suggest(word: string): string[] {
  if (!englishSpell || !norwegianSpell) return [];
  const combined = [...englishSpell.suggest(word), ...norwegianSpell.suggest(word)];
  return Array.from(new Set(combined)).slice(0, 5);
}

// Session-only: added words aren't persisted to disk, so they reset on restart.
export function addToDictionary(word: string): void {
  englishSpell?.add(word);
  norwegianSpell?.add(word);
}
