import { config } from "../config.js";
import { Semaphore } from "./shared/semaphore.js";
import { validateSource } from "./shared/validateSource.js";
import type { CompileOptions, CompileResponse, Toolchain } from "./types.js";

// Global across all toolchains: bounds total host resource usage regardless of which compiler backend is invoked.
const semaphore = new Semaphore(config.maxConcurrentCompiles);

/**
 * Runs a compile under the global concurrency limit. Each platform's own
 * route (`routes/z88dk.ts`, `routes/cc65.ts`, ...) is responsible for
 * validating/whitelisting `targetId` and `options` against its own
 * toolchain before calling this - this function only enforces the generic,
 * compiler-agnostic checks (source size/safety, concurrency).
 */
export async function runCompile(
  source: string,
  targetId: string,
  toolchain: Toolchain,
  options: CompileOptions = {}
): Promise<CompileResponse> {
  validateSource(source);

  const release = await semaphore.acquire();
  try {
    const startedAt = performance.now();
    const result = await toolchain.compile(source, targetId, options);
    return { ...result, compileTimeMs: Math.round(performance.now() - startedAt) };
  } finally {
    release();
  }
}

