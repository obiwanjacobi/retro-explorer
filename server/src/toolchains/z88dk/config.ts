import path from "node:path";
import { detectVersionFromFile } from "../shared/detectToolVersion.js";
import { resolveToolHome } from "../shared/resolveToolHome.js";

const { home: z88dkHome, exePath: zccExe } = resolveToolHome("Z88DK_HOME", [
  "bin",
  process.platform === "win32" ? "zcc.exe" : "zcc",
]);

const zccCfg = path.join(z88dkHome, "lib", "config") + path.sep;

export const z88dkConfig = {
  z88dkHome,
  zccExe,
  zccCfg,
  // changelog.txt's top entry starts with a line like "z88dk v2.4 - 02.10.2025".
  version: detectVersionFromFile(path.join(z88dkHome, "changelog.txt"), /^z88dk (v[\d.]+)/m),
};
