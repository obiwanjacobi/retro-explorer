import path from "node:path";
import { detectToolVersion } from "../shared/detectToolVersion.js";
import { resolveToolHome } from "../shared/resolveToolHome.js";

const { home: cc65Home, exePath: cl65Exe } = resolveToolHome("CC65_HOME", [
  "bin",
  process.platform === "win32" ? "cl65.exe" : "cl65",
]);

export const cc65Config = {
  cc65Home,
  cl65Exe,
  // cl65 --version prints "cl65 V2.19 - Git e11fb5c".
  version: detectToolVersion(cl65Exe, ["--version"], /(V[\d.]+)/, {
    PATH: `${path.join(cc65Home, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
    CC65_HOME: cc65Home,
  }),
};
