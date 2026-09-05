import type { Toolchain } from "../types.js";
import { getZ88dkClibs } from "./clibDiscovery.js";
import { compileWithZ88dk } from "./compiler.js";
import { Z88DK_COMPILERS } from "./compilers.js";
import { resolveZ88dkTarget, Z88DK_TARGETS } from "./targets.js";

/** The z88dk toolchain: compiles C via zcc (sccz80 or sdcc front end) and z80asm for various retro Z80 targets. */
export const z88dkToolchain: Toolchain = {
  id: "z88dk",
  label: "z88dk",
  targets: Z88DK_TARGETS.map(({ id, label }) => ({
    id,
    label,
    toolchainId: "z88dk",
    clibs: getZ88dkClibs(id),
  })),
  compilers: Z88DK_COMPILERS,
  compile(source, targetId, options = {}) {
    const target = resolveZ88dkTarget(targetId);
    if (!target) {
      // The registry only ever dispatches ids taken from `targets` above, so this indicates a bug, not bad user input.
      throw new Error(`z88dk toolchain has no target registered for id "${targetId}".`);
    }
    return compileWithZ88dk(source, target.zccFlag, options.compilerId ?? "sccz80", options.clibId);
  },
};
