import { createContext, useContext } from "react";

const NoteDirContext = createContext<string | null>(null);

export const NoteDirProvider = NoteDirContext.Provider;

export function useNoteDir(): string | null {
  return useContext(NoteDirContext);
}
