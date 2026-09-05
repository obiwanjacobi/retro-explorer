import fs from "node:fs";
import path from "node:path";
import { z88dkConfig } from "./config.js";

export interface Z88dkClib {
  id: string;
  label: string;
}

// These clib variants bake in a specific `-compiler=` (sdcc/clang) and register
// convention, which would conflict with our separate compiler selector - so we
// exclude them here and only let the compiler dropdown control that choice.
const EXCLUDED_PREFIXES = ["sdcc", "clang"];

const CLIB_ROW = /^CLIB\s+(\S+)/gm;

const cache = new Map<string, Z88dkClib[]>();

/**
 * Reads `<Z88DK_HOME>/lib/config/<targetId>.cfg` and returns the C library
 * variants it defines (via `-clib=`), so the UI can offer exactly what this
 * z88dk installation actually supports for the target - nothing is hardcoded.
 */
export function getZ88dkClibs(targetId: string): Z88dkClib[] {
  const cached = cache.get(targetId);
  if (cached) return cached;

  const cfgPath = path.join(z88dkConfig.z88dkHome, "lib", "config", `${targetId}.cfg`);
  let text: string;
  try {
    text = fs.readFileSync(cfgPath, "utf8");
  } catch {
    cache.set(targetId, []);
    return [];
  }

  const clibs: Z88dkClib[] = [];
  for (const m of text.matchAll(CLIB_ROW)) {
    const name = m[1];
    if (!EXCLUDED_PREFIXES.some((p) => name.toLowerCase().startsWith(p))) {
      clibs.push({ id: name, label: name });
    }
  }

  cache.set(targetId, clibs);
  return clibs;
}
