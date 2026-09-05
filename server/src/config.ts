import path from "node:path";
import fs from "node:fs";
import "dotenv/config";

function requireEnvPath(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const z88dkHome = requireEnvPath("Z88DK_HOME");
const zccExe = path.join(z88dkHome, "bin", process.platform === "win32" ? "zcc.exe" : "zcc");

if (!fs.existsSync(zccExe)) {
  throw new Error(
    `zcc executable not found at ${zccExe}. Check the Z88DK_HOME environment variable.`
  );
}

export const config = {
  z88dkHome,
  zccExe,
  zccCfg: path.join(z88dkHome, "lib", "config") + path.sep,
  port: Number(process.env.PORT ?? 4000),
  maxConcurrentCompiles: Number(process.env.MAX_CONCURRENT_COMPILES ?? 2),
  compileTimeoutMs: Number(process.env.COMPILE_TIMEOUT_MS ?? 10_000),
  maxSourceBytes: Number(process.env.MAX_SOURCE_BYTES ?? 65_536),
};
