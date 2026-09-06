import path from "node:path";
import { resolveToolHome } from "../shared/resolveToolHome.js";

const { home: z88dkHome, exePath: zccExe } = resolveToolHome("Z88DK_HOME", [
  "bin",
  process.platform === "win32" ? "zcc.exe" : "zcc",
]);

export const z88dkConfig = {
  z88dkHome,
  zccExe,
  zccCfg: path.join(z88dkHome, "lib", "config") + path.sep,
};
