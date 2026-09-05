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
 * All of these have been verified to build a trivial C program out of the box
 * with the flags used in compiler.ts.
 */
export const Z88DK_TARGETS: Z88dkTarget[] = [
  { id: "zx", label: "ZX Spectrum 48K", zccFlag: "+zx" },
  { id: "zxn", label: "ZX Spectrum Next", zccFlag: "+zxn" },
  { id: "ts2068", label: "Timex Sinclair 2068", zccFlag: "+ts2068" },
  { id: "cpm", label: "CP/M", zccFlag: "+cpm" },
  { id: "rc2014", label: "RC2014", zccFlag: "+rc2014" },
  { id: "msx", label: "MSX", zccFlag: "+msx" },
  { id: "cpc", label: "Amstrad CPC", zccFlag: "+cpc" },
  { id: "gb", label: "Game Boy", zccFlag: "+gb" },
  { id: "sms", label: "Sega Master System", zccFlag: "+sms" },
  { id: "coleco", label: "ColecoVision", zccFlag: "+coleco" },
  { id: "sam", label: "SAM Coupé", zccFlag: "+sam" },
  { id: "agon", label: "Agon Light", zccFlag: "+agon" },
  { id: "m5", label: "Sord M5", zccFlag: "+m5" },
  { id: "z88", label: "Cambridge Z88", zccFlag: "+z88" },
  { id: "pc88", label: "NEC PC-88", zccFlag: "+pc88" },
  { id: "trs80", label: "TRS-80", zccFlag: "+trs80" },
  { id: "enterprise", label: "Enterprise 128", zccFlag: "+enterprise" },
];

export function resolveZ88dkTarget(id: string): Z88dkTarget | undefined {
  return Z88DK_TARGETS.find((t) => t.id === id);
}
