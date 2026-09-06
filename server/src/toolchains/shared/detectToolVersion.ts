import { spawnSync } from "node:child_process";
import fs from "node:fs";

/**
 * Runs a toolchain's executable once at startup to extract its version string via regex, so a
 * toolchain's reported version reflects whatever is actually installed rather than a hardcoded
 * guess - this is the groundwork for eventually registering multiple versions of the same toolchain.
 * Returns "unknown" if the tool can't be run or its output doesn't match `versionRegex`.
 */
export function detectToolVersion(
  exePath: string,
  args: string[],
  versionRegex: RegExp,
  env: NodeJS.ProcessEnv
): string {
  // Both zcc and cl65 print their version banner to stderr rather than stdout, so both streams must be checked.
  const result = spawnSync(exePath, args, { env, windowsHide: true, timeout: 5000 });
  const output = `${result.stdout?.toString() ?? ""}\n${result.stderr?.toString() ?? ""}`;
  return output.match(versionRegex)?.[1] ?? "unknown";
}

/** Reads a version string via regex out of a text file (e.g. z88dk's `changelog.txt`, which has no other way to query its release version). */
export function detectVersionFromFile(filePath: string, versionRegex: RegExp): string {
  try {
    return fs.readFileSync(filePath, "utf8").match(versionRegex)?.[1] ?? "unknown";
  } catch {
    return "unknown";
  }
}
