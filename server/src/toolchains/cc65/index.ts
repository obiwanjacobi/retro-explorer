import type { Toolchain } from "../types.js";
import { compileWithCc65 } from "./compiler.js";
import { cc65Config } from "./config.js";
import { CC65_TARGETS, resolveCc65Target } from "./targets.js";

/** The cc65 toolchain: compiles C via cl65 (cc65/ca65/ld65) for various retro 6502 targets. */
export const cc65Toolchain: Toolchain = {
  id: "cc65",
  label: "cc65",
  cpus: ["6502"],
  version: cc65Config.version,
  targets: CC65_TARGETS.map(({ id, label }) => ({
    id,
    label,
    toolchainId: "cc65",
    cpus: ["6502"],
  })),
  compile(source, targetId, options = {}) {
    const target = resolveCc65Target(targetId);
    if (!target) {
      // The registry only ever dispatches ids taken from `targets` above, so this indicates a bug, not bad user input.
      throw new Error(`cc65 toolchain has no target registered for id "${targetId}".`);
    }
    return compileWithCc65(source, target.ccTarget, options.optLevel);
  },
};
