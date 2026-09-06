import { CPUS, type Cpu } from "./cpus.js";
import type { CompilerOption, CompileTarget, Toolchain } from "./types.js";
import { cc65Toolchain } from "./cc65/index.js";
import { z88dkToolchain } from "./z88dk/index.js";

/**
 * All registered compiler toolchains. To add another compiler (e.g. sdcc),
 * implement the `Toolchain` interface in its own `toolchains/<name>/` folder
 * and add it to this list - nothing else in the request pipeline needs to
 * change, since targets are dispatched to their owning toolchain automatically.
 */
const toolchains: Toolchain[] = [z88dkToolchain, cc65Toolchain];

export function listTargets(): CompileTarget[] {
  return toolchains.flatMap((t) => t.targets);
}

export function listToolchains(): Array<{ id: string; label: string; cpus: string[]; compilers: CompilerOption[] }> {
  return toolchains.map(({ id, label, cpus, compilers }) => ({ id, label, cpus, compilers: compilers ?? [] }));
}

/** CPUs actually supported by at least one registered toolchain, in the static display order from `cpus.ts`. */
export function listCpus(): Cpu[] {
  const supported = new Set(toolchains.flatMap((t) => t.cpus));
  return CPUS.filter((c) => supported.has(c.id));
}
