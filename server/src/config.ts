import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  maxConcurrentCompiles: Number(process.env.MAX_CONCURRENT_COMPILES ?? 2),
  compileTimeoutMs: Number(process.env.COMPILE_TIMEOUT_MS ?? 10_000),
  maxSourceBytes: Number(process.env.MAX_SOURCE_BYTES ?? 65_536),
};
