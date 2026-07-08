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

// Strips the trailing ".md" from a file name, for display as a note "title".
export function noteTitle(name: string): string {
  return name.replace(/\.md$/i, "");
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
    } else if (name.toLowerCase().endsWith(".md")) {
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
  const name = fileName.toLowerCase().endsWith(".md") ? fileName : `${fileName}.md`;
  const path = await join(dirPath, name);
  if (await exists(path)) {
    throw new Error(`"${name}" already exists`);
  }
  await writeTextFile(path, `# ${noteTitle(name)}\n\n`);
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
  const name = !isDirectory && !newName.toLowerCase().endsWith(".md") ? `${newName}.md` : newName;
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

export async function saveImage(noteDir: string, file: File): Promise<string> {
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
