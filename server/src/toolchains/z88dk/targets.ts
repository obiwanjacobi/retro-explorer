export interface Z88dkTarget {
  /** Unique id used in the API request, e.g. "zx". */
  id: string;
  /** Human readable label for the UI. */
  label: string;
  /** The `+target` flag passed to zcc. */
  zccFlag: string;
}

/**
 * Whitelisted zcc targets. Never let the client supply an arbitrary flag -
 * only an id from this list, resolved server-side to the actual zcc argument.
 */
export const Z88DK_TARGETS: Z88dkTarget[] = [
  { id: "zx", label: "ZX Spectrum 48K", zccFlag: "+zx" },
  { id: "cpm", label: "CP/M", zccFlag: "+cpm" },
  { id: "rc2014", label: "RC2014", zccFlag: "+rc2014" },
  { id: "msx", label: "MSX", zccFlag: "+msx" },
];

export function resolveZ88dkTarget(id: string): Z88dkTarget | undefined {
  return Z88DK_TARGETS.find((t) => t.id === id);
}
