import { config } from "../config.js";
import { findToolchainForTarget } from "./registry.js";
import { Semaphore } from "./shared/semaphore.js";
import { validateSource } from "./shared/validateSource.js";
import type { CompileResponse } from "./types.js";
import { CompileRequestError } from "./types.js";

// Global across all toolchains: bounds total host resource usage regardless of which compiler backend is invoked.
const semaphore = new Semaphore(config.maxConcurrentCompiles);

/** Validates the request, picks the right toolchain for the target, and runs the compile under the concurrency limit. */
export async function runCompile(source: string, targetId: string, compilerId?: string): Promise<CompileResponse> {
  validateSource(source);

  const toolchain = findToolchainForTarget(targetId);
  if (!toolchain) {
    throw new CompileRequestError(`Unknown target "${targetId}".`);
  }
  if (compilerId && !toolchain.compilers?.some((c) => c.id === compilerId)) {
    throw new CompileRequestError(`Unknown compiler "${compilerId}" for this target.`);
  }

  const release = await semaphore.acquire();
  try {
    return await toolchain.compile(source, targetId, compilerId);
  } finally {
    release();
  }
}
