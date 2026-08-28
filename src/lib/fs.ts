import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile, writeFile, readDir, exists, mkdir, rename } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

const IGNORED_DIRS = new Set([".git", "node_modules", ".obsidian", "assets"]);

// File extensions that show up in the tree and can be opened/edited as notes.
const NOTE_EXTENSIONS = [".md", ".txt"];
const DEFAULT_NOTE_EXTENSION = ".md";

// Returns the note extension (".md" / ".txt") a file name ends with, or null
// if it doesn't end with one of the extensions this app treats as a note.
function noteExtension(name: string): string | null {
  const lower = name.toLowerCase();
  return NOTE_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? null;
}

export function isPlainTextFile(path: string): boolean {
  return noteExtension(path) === ".txt";
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function dirname(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx === -1 ? path : path.slice(0, idx);
}

// Strips the trailing note extension (".md" / ".txt") from a file name, for
// display as a note "title".
export function noteTitle(name: string): string {
  const ext = noteExtension(name);
  return ext ? name.slice(0, -ext.length) : name;
}

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];
  for (const node of nodes) {
    if (node.isDirectory) {
      files.push(...flattenFiles(node.children ?? []));
    } else {
      files.push(node);
    }
  }
  return files;
}

export async function pickDirectory(): Promise<string | null> {
  const selected = await openDialog({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

export async function pathExists(path: string): Promise<boolean> {
  return exists(path);
}

export async function readMarkdownTree(dirPath: string): Promise<FileNode[]> {
  const entries = await readDir(dirPath);
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const name = entry.name ?? "";
    if (!name || name.startsWith(".") || IGNORED_DIRS.has(name)) continue;

    const entryPath = await join(dirPath, name);

    if (entry.isDirectory) {
      const children = await readMarkdownTree(entryPath);
      nodes.push({ name, path: entryPath, isDirectory: true, children });
    } else if (noteExtension(name)) {
      nodes.push({ name, path: entryPath, isDirectory: false });
    }
  }

  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readNote(path: string): Promise<string> {
  return readTextFile(path);
}

export async function writeNote(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function createNote(dirPath: string, fileName: string): Promise<string> {
  const ext = noteExtension(fileName) ?? DEFAULT_NOTE_EXTENSION;
  const name = noteExtension(fileName) ? fileName : `${fileName}${ext}`;
  const path = await join(dirPath, name);
  if (await exists(path)) {
    throw new Error(`"${name}" already exists`);
  }
  const content = ext === ".txt" ? "" : `# ${noteTitle(name)}\n\n`;
  await writeTextFile(path, content);
  return path;
}

// Creates a note pre-filled with a lecture-note template: a heading with the
// topic and today's date, plus sections for the parts of a lecture worth capturing.
export async function createLectureNote(dirPath: string, topic: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const safeTopic = topic.trim().replace(/[\\/:*?"<>|]/g, "-");
  const fileName = safeTopic ? `${date} ${safeTopic}` : date;
  const name = `${fileName}.md`;
  const path = await join(dirPath, name);
  if (await exists(path)) {
    throw new Error(`"${name}" already exists`);
  }
  const heading = safeTopic ? `${safeTopic} — ${date}` : date;
  const content = `# ${heading}\n\n## Topics Covered\n\n\n## Notes\n\n\n## Questions / Follow-ups\n\n`;
  await writeTextFile(path, content);
  return path;
}

const TEMPLATES_DIR_NAME = ".templates";

export interface TemplateInfo {
  name: string;
  path: string;
}

const DEFAULT_TEMPLATE_CONTENT =
  "Write your template below. Use {{title}} and {{date}} as placeholders — " +
  "they'll be filled in when you create a note from this template.\n\n";

// Templates live in a hidden `.templates` folder at the vault root, alongside
// (but never mixed into) the regular note tree — readMarkdownTree already
// skips dot-folders, so they never show up as notes, in search, or as
// wiki-link targets.
export async function listTemplates(rootDir: string): Promise<TemplateInfo[]> {
  const dir = await join(rootDir, TEMPLATES_DIR_NAME);
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  const templates: TemplateInfo[] = [];
  for (const entry of entries) {
    const name = entry.name ?? "";
    if (!name || entry.isDirectory || !noteExtension(name)) continue;
    templates.push({ name: noteTitle(name), path: await join(dir, name) });
  }
  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createTemplate(rootDir: string, name: string): Promise<string> {
  const dir = await join(rootDir, TEMPLATES_DIR_NAME);
  if (!(await exists(dir))) {
    await mkdir(dir);
  }
  const fileName = noteExtension(name) ? name : `${name}${DEFAULT_NOTE_EXTENSION}`;
  const path = await join(dir, fileName);
  if (await exists(path)) {
    throw new Error(`A template named "${fileName}" already exists`);
  }
  await writeTextFile(path, DEFAULT_TEMPLATE_CONTENT);
  return path;
}

// Fills in the placeholders a template can use: {{title}} becomes the new
// note's title, {{date}} becomes today's date.
export function applyTemplateTokens(content: string, title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return content.replace(/\{\{\s*title\s*\}\}/gi, title).replace(/\{\{\s*date\s*\}\}/gi, date);
}

export async function createNoteFromTemplate(
  dirPath: string,
  fileName: string,
  templateContent: string,
): Promise<string> {
  const ext = noteExtension(fileName) ?? DEFAULT_NOTE_EXTENSION;
  const name = noteExtension(fileName) ? fileName : `${fileName}${ext}`;
  const path = await join(dirPath, name);
  if (await exists(path)) {
    throw new Error(`"${name}" already exists`);
  }
  await writeTextFile(path, applyTemplateTokens(templateContent, noteTitle(name)));
  return path;
}

export async function createFolder(parentDir: string, folderName: string): Promise<string> {
  const path = await join(parentDir, folderName);
  if (await exists(path)) {
    throw new Error(`"${folderName}" already exists`);
  }
  await mkdir(path);
  return path;
}

// Moves a file/folder into a different directory (e.g. dragged onto a folder in the tree),
// keeping its original name. Returns the new path.
export async function moveEntry(sourcePath: string, destDir: string): Promise<string> {
  const name = basename(sourcePath);
  const destPath = await join(destDir, name);
  if (destPath === sourcePath) return sourcePath;
  if (await exists(destPath)) {
    throw new Error(`"${name}" already exists in the destination folder`);
  }
  await rename(sourcePath, destPath);
  return destPath;
}

// Renames a file/folder in place, keeping it in the same directory. Returns the new path.
export async function renameEntry(path: string, newName: string, isDirectory: boolean): Promise<string> {
  let name = newName;
  if (!isDirectory && !noteExtension(newName)) {
    const currentExt = noteExtension(basename(path)) ?? DEFAULT_NOTE_EXTENSION;
    name = `${newName}${currentExt}`;
  }
  const destPath = await join(dirname(path), name);
  if (destPath === path) return path;
  if (await exists(destPath)) {
    throw new Error(`"${name}" already exists`);
  }
  await rename(path, destPath);
  return destPath;
}

// Moves the file/folder to the OS recycle bin (Windows) or trash (Linux)
// via the custom `move_to_trash` Rust command, rather than deleting permanently.
export async function deleteEntry(path: string): Promise<void> {
  await invoke("move_to_trash", { path });
}

const TAG_PATTERN = /#([a-zA-Z][\w-]*)/g;

// Extracts #tag-style hashtags from a note's raw markdown. Requires a letter
// right after the "#" so markdown headings ("# Heading") aren't picked up.
export function extractTags(content: string): string[] {
  const tags = new Set<string>();
  for (const match of content.matchAll(TAG_PATTERN)) {
    tags.add(match[1]);
  }
  return Array.from(tags);
}

// Reads every note under `nodes` once and builds a path -> tags map, used to
// power the sidebar's tag filter.
export async function buildTagIndex(nodes: FileNode[]): Promise<Record<string, string[]>> {
  const files = flattenFiles(nodes);
  const entries = await Promise.all(
    files.map(async (file): Promise<[string, string[]]> => {
      try {
        const content = await readTextFile(file.path);
        return [file.path, extractTags(content)];
      } catch {
        return [file.path, []];
      }
    }),
  );
  return Object.fromEntries(entries);
}

export async function saveImage(noteDir: string, file: Blob): Promise<string> {
  const assetsDir = await join(noteDir, "assets");
  if (!(await exists(assetsDir))) {
    await mkdir(assetsDir);
  }

  const extension = IMAGE_EXTENSIONS[file.type] ?? "png";
  const filename = `pasted-${Date.now()}.${extension}`;
  const filePath = await join(assetsDir, filename);

  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(filePath, bytes);

  return `assets/${filename}`;
}
