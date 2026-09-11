import type { Toolchain } from "../types.js";
import { getZ88dkClibs } from "./clibDiscovery.js";
import { compileWithZ88dk } from "./compiler.js";
import { Z88DK_COMPILERS } from "./compilers.js";
import { z88dkConfig } from "./config.js";
import { Z88DK_CPUS } from "./cpus.js";
import { resolveZ88dkTarget, Z88DK_TARGETS } from "./targets.js";

const targets = Z88DK_TARGETS.map(({ id, label }) => {
  const clibs = getZ88dkClibs(id);
  const cpus = clibs.length > 0 ? Array.from(new Set(clibs.map((c) => c.cpuId))) : ["z80"];
  return { id, label, toolchainId: "z88dk", cpus, clibs };
});

// zcc's whole "CPU Targetting" section (everything in `cpus.ts`) belongs to z88dk regardless of
// whether a currently-registered target's clib actually reaches it (e.g. r3k/r6k have no working
// clib on this install, but z88dk is still the toolchain that owns/defines those CPU ids).
const Z88DK_CPU_FAMILY = Z88DK_CPUS.map((c) => c.id);

// The bare "z80" (no-machine) target has no baked-in `-m<cpu>` anywhere in z80.cfg (verified: its OPTIONS
// line sets none, unlike zxn/agon/z180) - any CPU can be force-selected on it via an explicit `-m<cpu>`
// override (see `compile()` below), even ones with no CLIB row of their own (e.g. r3k/r6k).
const BARE_Z80_TARGET_ID = "z80";
for (const t of targets) {
  if (t.id === BARE_Z80_TARGET_ID) t.cpus = Z88DK_CPU_FAMILY;
}

/** The z88dk toolchain: compiles C via zcc (sccz80 or sdcc front end) and z80asm for various retro Z80 targets. */
export const z88dkToolchain: Toolchain = {
  id: "z88dk",
  label: "z88dk",
  cpus: Z88DK_CPUS,
  version: z88dkConfig.version,
  targets,
  compilers: Z88DK_COMPILERS,
  compile(source, targetId, options = {}) {
    const target = resolveZ88dkTarget(targetId);
    if (!target) {
      // The registry only ever dispatches ids taken from `targets` above, so this indicates a bug, not bad user input.
      throw new Error(`z88dk toolchain has no target registered for id "${targetId}".`);
    }
    // Surface the CPU targeting explicitly on the command line (e.g. `-m8080`, `-mz180`) instead of
    // leaving it hidden inside the .cfg file's CLIB/OPTIONS row. Skip the generic "z80"/"6502" bucket:
    // it's also used as a fallback for targets that secretly pin a non-CPU_FLAG variant (e.g. zxn's
    // `-mz80n`, agon uses ez80_z80 which IS distinct) - re-emitting a plain `-mz80` there could override
    // and break that hidden flag. See `clibDiscovery.ts`'s CPU_FLAG regex for the exact distinct-CPU set.
    const clibCpuId = targets.find((t) => t.id === targetId)?.clibs?.find((c) => c.id === options.clibId)?.cpuId;
    const isGenericClibCpu = !clibCpuId || clibCpuId === "z80" || clibCpuId === "6502";
    // The bare z80 target has no hidden per-target flag to conflict with (unlike zxn/agon/z180), so honor
    // an explicit CPU override there even when the chosen clib itself doesn't pin a distinct CPU.
    const overrideCpuId = isGenericClibCpu && targetId === BARE_Z80_TARGET_ID ? options.cpuId : undefined;
    const effectiveCpuId = isGenericClibCpu ? overrideCpuId : clibCpuId;
    const cpuFlag = effectiveCpuId && effectiveCpuId !== "z80" && effectiveCpuId !== "6502" ? `-m${effectiveCpuId}` : undefined;
    return compileWithZ88dk(source, target.zccFlag, options.compilerId ?? "sccz80", options.clibId, options.optLevel, cpuFlag);
  },
};
