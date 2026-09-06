import fs from "node:fs";
import path from "node:path";
import { z88dkConfig } from "./config.js";

export interface Z88dkClib {
  id: string;
  label: string;
  /** CPU id this clib targets (see `toolchains/cpus.ts`), resolved from zcc's `-m<cpu>` flags. */
  cpuId: string;
}

// These clib variants bake in a specific `-compiler=` (sdcc/clang) and register
// convention, which would conflict with our separate compiler selector - so we
// exclude them here and only let the compiler dropdown control that choice.
const EXCLUDED_PREFIXES = ["sdcc", "clang"];

const CLIB_ROW = /^CLIB\s+(\S+)(.*)$/gm;
const OPTIONS_ROW = /^OPTIONS\s+(.*)$/m;
const CRT0_ROW = /^CRT0\s+(\S+)/m;
const CRT0_OVERRIDE = /-crt0=(\S+)/;
const NO_CRT = /--no-crt\b/;

// Matches zcc's `-m<cpu>` "CPU Targetting" flags (from `zcc --help`) that name an actual distinct
// CPU (see `cpus.ts`). `-mz80_ixiy`/`-mz80_strict`/`-mz80n`/`-mgbz80` are deliberately excluded -
// they're still z80 silicon or a machine name, not a distinct CPU, so those fall back to plain "z80".
const CPU_FLAG = /-m(8080|8085|z180|r2ka|r3k|r4k|r6k|ez80_z80|kc160)\b/;

/** Extracts the CPU id from a `-m<cpu>` flag in `text`, or null if none is present. */
function extractCpuId(text: string): string | null {
  return text.match(CPU_FLAG)?.[1] ?? null;
}

/**
 * Some target configs still list a CLIB whose startup asm was since retired/moved (e.g. rc2014.cfg's
 * "default" clib falls back to a top-level `CRT0 DESTDIR\lib\rc2014_crt0` that no longer exists on
 * disk, per that file's own "# Not supported in classic library" comment) - compiling with one of
 * these fails with a raw shell "file not found" error instead of a useful diagnostic. Resolve the
 * effective crt0 template (row's own `-crt0=` override, else the target's baseline `CRT0` line) and
 * verify the file actually exists before offering the clib at all.
 */
function hasWorkingCrt0(rowText: string, baselineCrt0: string | null): boolean {
  if (NO_CRT.test(rowText)) return true;
  const template = rowText.match(CRT0_OVERRIDE)?.[1] ?? baselineCrt0;
  if (!template) return true;
  const resolved = template.replace(/\\/g, "/").replace(/DESTDIR/g, z88dkConfig.z88dkHome.replace(/\\/g, "/"));
  const candidates = /\.(asm|m4)$/i.test(resolved) ? [resolved] : [`${resolved}.asm`, `${resolved}.asm.m4`];
  return candidates.some((c) => fs.existsSync(c));
}

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
  // Some targets (e.g. zxn.cfg, agon.cfg) pin their CPU via a target-wide `-m<cpu>` flag on the
  // OPTIONS line rather than per CLIB row - use that as the fallback when a row has none of its own.
  const baselineCpuId = extractCpuId(text.match(OPTIONS_ROW)?.[1] ?? "") ?? "z80";
  const baselineCrt0 = text.match(CRT0_ROW)?.[1] ?? null;
  for (const m of text.matchAll(CLIB_ROW)) {
    const name = m[1];
    const rowText = m[2];
    if (!EXCLUDED_PREFIXES.some((p) => name.toLowerCase().startsWith(p)) && hasWorkingCrt0(rowText, baselineCrt0)) {
      clibs.push({ id: name, label: name, cpuId: extractCpuId(rowText) ?? baselineCpuId });
    }
  }

  cache.set(targetId, clibs);
  return clibs;
}
