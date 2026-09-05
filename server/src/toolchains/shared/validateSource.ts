import { config } from "../../config.js";
import { CompileRequestError } from "../types.js";

/** Rejects obviously dangerous #include paths (traversal / absolute paths) before we ever hand source to a compiler. */
function findUnsafeInclude(source: string): string | null {
  const includeRe = /#\s*include\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = includeRe.exec(source))) {
    const target = m[1];
    if (target.includes("..") || target.startsWith("/") || target.startsWith("\\") || /^[a-zA-Z]:/.test(target)) {
      return target;
    }
  }
  return null;
}

/**
 * Validation shared by every toolchain, regardless of which compiler backend
 * ends up running the source: size limits, null bytes, unsafe includes.
 */
export function validateSource(source: string): void {
  if (typeof source !== "string" || source.length === 0) {
    throw new CompileRequestError("Source code is required.");
  }
  if (Buffer.byteLength(source, "utf8") > config.maxSourceBytes) {
    throw new CompileRequestError(`Source exceeds the maximum allowed size of ${config.maxSourceBytes} bytes.`);
  }
  if (source.includes("\0")) {
    throw new CompileRequestError("Source contains an invalid null byte.");
  }
  const unsafeInclude = findUnsafeInclude(source);
  if (unsafeInclude) {
    throw new CompileRequestError(`Disallowed #include path: "${unsafeInclude}". Use angle-bracket system includes only.`);
  }
}
