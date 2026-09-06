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
 */
export const CC65_TARGETS: Cc65Target[] = [{ id: "c64", label: "Commodore 64", ccTarget: "c64" }];

export function resolveCc65Target(id: string): Cc65Target | undefined {
  return CC65_TARGETS.find((t) => t.id === id);
}
