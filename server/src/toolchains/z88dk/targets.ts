import fs from "node:fs";
import path from "node:path";
import { z88dkConfig } from "./config.js";

export interface Z88dkTarget {
  /** Unique id used in the API request, e.g. "zx". Same as the `.cfg` file's basename. */
  id: string;
  /** Human readable label for the UI. */
  label: string;
  /** The `+target` flag passed to zcc. */
  zccFlag: string;
}

/**
 * Friendly labels for the ids most people recognize by name rather than zcc's internal cfg
 * basename. Every other `.cfg` file in `lib/config` is still imported as a target below - just
 * labelled with its bare id - so obscure/homebrew machines remain selectable, just less prettily.
 */
const FRIENDLY_LABELS: Record<string, string> = {
  z80: "Generic (no machine)",
  zx: "ZX Spectrum 48K",
  zxn: "ZX Spectrum Next",
  ts2068: "Timex Sinclair 2068",
  cpm: "CP/M",
  rc2014: "RC2014",
  msx: "MSX",
  cpc: "Amstrad CPC",
  gb: "Game Boy",
  sms: "Sega Master System",
  coleco: "ColecoVision",
  sam: "SAM Coupé",
  agon: "Agon Light",
  m5: "Sord M5",
  z88: "Cambridge Z88",
  pc88: "NEC PC-88",
  trs80: "TRS-80",
  enterprise: "Enterprise 128",
};

function labelFor(id: string): string {
  return FRIENDLY_LABELS[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Every `.cfg` file under z88dk's `lib/config` is a real, buildable `+target` (verified: all of
 * them define a `CRT0` row) - so rather than hand-maintain a whitelist, import the whole directory.
 * Never let the client supply an arbitrary flag though: only an id resolved from this list (i.e.
 * an actual file on disk) is ever turned into a zcc argument.
 */
export const Z88DK_TARGETS: Z88dkTarget[] = fs
  .readdirSync(path.join(z88dkConfig.z88dkHome, "lib", "config"))
  .filter((f) => f.endsWith(".cfg"))
  .map((f) => {
    const id = f.slice(0, -".cfg".length);
    return { id, label: labelFor(id), zccFlag: `+${id}` };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

export function resolveZ88dkTarget(id: string): Z88dkTarget | undefined {
  return Z88DK_TARGETS.find((t) => t.id === id);
}
