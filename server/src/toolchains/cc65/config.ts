import { resolveToolHome } from "../shared/resolveToolHome.js";

const { home: cc65Home, exePath: cl65Exe } = resolveToolHome("CC65_HOME", [
  "bin",
  process.platform === "win32" ? "cl65.exe" : "cl65",
]);

export const cc65Config = {
  cc65Home,
  cl65Exe,
};
