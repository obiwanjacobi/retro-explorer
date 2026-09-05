import type { CompileTarget, Toolchain } from "./types.js";
import { z88dkToolchain } from "./z88dk/index.js";

/**
 * All registered compiler toolchains. To add another compiler (e.g. sdcc),
 * implement the `Toolchain` interface in its own `toolchains/<name>/` folder
 * and add it to this list - nothing else in the request pipeline needs to
 * change, since targets are dispatched to their owning toolchain automatically.
 */
const toolchains: Toolchain[] = [z88dkToolchain];

const targetOwners = new Map<string, Toolchain>();
for (const toolchain of toolchains) {
  for (const target of toolchain.targets) {
    targetOwners.set(target.id, toolchain);
  }
}

export function listTargets(): CompileTarget[] {
  return toolchains.flatMap((t) => t.targets);
}

export function findToolchainForTarget(targetId: string): Toolchain | undefined {
  return targetOwners.get(targetId);
}
