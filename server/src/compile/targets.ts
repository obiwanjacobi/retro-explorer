export interface CompileTarget {
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
export const COMPILE_TARGETS: CompileTarget[] = [
  { id: "zx", label: "ZX Spectrum 48K", zccFlag: "+zx" },
  { id: "cpm", label: "CP/M", zccFlag: "+cpm" },
  { id: "rc2014", label: "RC2014", zccFlag: "+rc2014" },
  { id: "msx", label: "MSX", zccFlag: "+msx" },
];

export function resolveTarget(id: string): CompileTarget | undefined {
  return COMPILE_TARGETS.find((t) => t.id === id);
}
