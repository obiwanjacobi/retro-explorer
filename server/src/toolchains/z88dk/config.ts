import fs from "node:fs";
import path from "node:path";

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

export const z88dkConfig = {
  z88dkHome,
  zccExe,
  zccCfg: path.join(z88dkHome, "lib", "config") + path.sep,
};
