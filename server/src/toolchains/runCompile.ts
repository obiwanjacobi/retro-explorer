import { config } from "../config.js";
import { findToolchainForTarget } from "./registry.js";
import { Semaphore } from "./shared/semaphore.js";
import { validateSource } from "./shared/validateSource.js";
import type { CompileOptions, CompileResponse } from "./types.js";
import { CompileRequestError } from "./types.js";

// Global across all toolchains: bounds total host resource usage regardless of which compiler backend is invoked.
const semaphore = new Semaphore(config.maxConcurrentCompiles);

/** Validates the request, picks the right toolchain for the target, and runs the compile under the concurrency limit. */
export async function runCompile(source: string, targetId: string, options: CompileOptions = {}): Promise<CompileResponse> {
  validateSource(source);

  const toolchain = findToolchainForTarget(targetId);
  if (!toolchain) {
    throw new CompileRequestError(`Unknown target "${targetId}".`);
  }
  if (options.compilerId && !toolchain.compilers?.some((c) => c.id === options.compilerId)) {
    throw new CompileRequestError(`Unknown compiler "${options.compilerId}" for this target.`);
  }
  if (options.clibId) {
    const target = toolchain.targets.find((t) => t.id === targetId);
    if (!target?.clibs?.some((c) => c.id === options.clibId)) {
      throw new CompileRequestError(`Unknown C library "${options.clibId}" for this target.`);
    }
  }

  const release = await semaphore.acquire();
  try {
    const startedAt = performance.now();
    const result = await toolchain.compile(source, targetId, options);
    return { ...result, compileTimeMs: Math.round(performance.now() - startedAt) };
  } finally {
    release();
  }
}

