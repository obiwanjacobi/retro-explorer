import fs from "node:fs";
import path from "node:path";

/**
 * Resolves a toolchain's install root from an env var (e.g. `Z88DK_HOME`,
 * `CC65_HOME`) and verifies its main executable exists, throwing a clear
 * startup error otherwise. Shared by every toolchain's own `config.ts`.
 */
export function resolveToolHome(envVarName: string, exeRelativeParts: string[]): { home: string; exePath: string } {
  const home = process.env[envVarName];
  if (!home) {
    throw new Error(`Missing required environment variable ${envVarName}`);
  }
  const exePath = path.join(home, ...exeRelativeParts);
  if (!fs.existsSync(exePath)) {
    throw new Error(`Executable not found at ${exePath}. Check the ${envVarName} environment variable.`);
  }
  return { home, exePath };
}
