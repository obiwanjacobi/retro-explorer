import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { SourceLine } from "../types.js";

/** Creates an isolated temp directory, runs `fn` with its path, and always removes it afterwards. */
export async function withTempWorkspace<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export function toSourceLines(source: string): SourceLine[] {
  return source.split(/\r?\n/).map((text, i) => ({ line: i + 1, text }));
}
