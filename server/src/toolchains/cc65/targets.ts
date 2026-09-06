export interface Cc65Target {
  /** Unique id used in the API request, e.g. "c64". */
  id: string;
  /** Human readable label for the UI. */
  label: string;
  /** The `-t` target system flag passed to cl65. */
  ccTarget: string;
}

/**
 * Whitelisted cl65 `-t` targets. Never let the client supply an arbitrary
 * value - only an id from this list, resolved server-side to the actual
 * cl65 argument. Each has been verified to build a trivial C program with
 * the flags used in compiler.ts.
 *
 * cc65 supports many more `-t` targets than are listed here (see
 * `cl65 --list-targets` / https://cc65.github.io/doc/cc65.html) - Atari,
 * Apple II, NES, and most other non-Commodore machines were deliberately
 * left out. `listing.ts`'s `buildInstructions()` reads real instruction
 * bytes out of the linked output binary assuming a plain PRG-style layout
 * (2-byte little-endian load address header, then a raw memory image
 * starting at that address, nothing else) - verified true for every target
 * below by inspecting its output file and cross-checking parsed instruction
 * bytes/addresses end-to-end. The other target families use different,
 * unverified binary layouts (e.g. Atari's `FF FF`-tagged multi-segment
 * executable format, NES's iNES ROM header, or no header/fixed load address
 * at all) that this parser would silently misread.
 */
export const CC65_TARGETS: Cc65Target[] = [
  { id: "c64", label: "Commodore 64", ccTarget: "c64" },
  { id: "c128", label: "Commodore 128", ccTarget: "c128" },
  { id: "c16", label: "Commodore 16/116", ccTarget: "c16" },
  { id: "plus4", label: "Commodore Plus/4", ccTarget: "plus4" },
  { id: "vic20", label: "Commodore VIC-20", ccTarget: "vic20" },
  { id: "pet", label: "Commodore PET", ccTarget: "pet" },
  { id: "cbm510", label: "CBM-II (510, 40-column)", ccTarget: "cbm510" },
  { id: "cbm610", label: "CBM-II (610/620, 80-column)", ccTarget: "cbm610" },
  { id: "cx16", label: "Commander X16", ccTarget: "cx16" },
];

export function resolveCc65Target(id: string): Cc65Target | undefined {
  return CC65_TARGETS.find((t) => t.id === id);
}
