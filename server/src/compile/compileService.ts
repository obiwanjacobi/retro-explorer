import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { config } from "../config.js";
import { computeAddressBase, parseCLis, parseDiagnostics, parseSymbolAddresses } from "./listParser.js";
import { resolveTarget } from "./targets.js";
import type { CompileResponse, SourceLine } from "./types.js";

export class CompileRequestError extends Error {}

const SOURCE_FILE_NAME = "main.c";

/** Simple counting semaphore to bound concurrent zcc invocations. */
class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(count: number) {
    this.available = count;
  }

  async acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available--;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.available--;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.available++;
    const next = this.queue.shift();
    if (next) next();
  }
}

const semaphore = new Semaphore(config.maxConcurrentCompiles);

/** Rejects obviously dangerous #include paths (traversal / absolute paths) before we ever hand source to zcc. */
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

function toSourceLines(source: string): SourceLine[] {
  return source.split(/\r?\n/).map((text, i) => ({ line: i + 1, text }));
}

async function readIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function compile(source: string, targetId: string): Promise<CompileResponse> {
  if (typeof source !== "string" || source.length === 0) {
    throw new CompileRequestError("Source code is required.");
  }
  if (Buffer.byteLength(source, "utf8") > config.maxSourceBytes) {
    throw new CompileRequestError(`Source exceeds the maximum allowed size of ${config.maxSourceBytes} bytes.`);
  }
  if (source.includes("\0")) {
    throw new CompileRequestError("Source contains an invalid null byte.");
  }
  const target = resolveTarget(targetId);
  if (!target) {
    throw new CompileRequestError(`Unknown target "${targetId}".`);
  }
  const unsafeInclude = findUnsafeInclude(source);
  if (unsafeInclude) {
    throw new CompileRequestError(`Disallowed #include path: "${unsafeInclude}". Use angle-bracket system includes only.`);
  }

  const release = await semaphore.acquire();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "z88dkweb-"));
  try {
    const sourcePath = path.join(tmpDir, SOURCE_FILE_NAME);
    await fs.writeFile(sourcePath, source, "utf8");

    const args = [
      target.zccFlag,
      "--list",
      "--c-code-in-asm",
      "-m",
      "-s",
      "-no-cleanup",
      "-o",
      "main",
      SOURCE_FILE_NAME,
    ];

    const { stdout, stderr } = await runZcc(args, tmpDir);
    const combinedOutput = `${stdout}\n${stderr}`.split(tmpDir).join("").split(sourcePath).join(SOURCE_FILE_NAME);
    const diagnostics = parseDiagnostics(combinedOutput);

    const cLis = await readIfExists(path.join(tmpDir, "main.c.lis"));
    const cSym = await readIfExists(path.join(tmpDir, "main.c.sym"));
    const map = await readIfExists(path.join(tmpDir, "main.map"));

    const sourceLines = toSourceLines(source);

    if (!cLis) {
      return {
        success: false,
        diagnostics: diagnostics.length > 0 ? diagnostics : [{ severity: "error", message: combinedOutput.trim() || "Compilation failed." }],
        instructions: [],
        sourceLines,
      };
    }

    const relativeSymbols = cSym ? parseSymbolAddresses(cSym) : new Map<string, number>();
    const linkedSymbols = map ? parseSymbolAddresses(map) : new Map<string, number>();
    const addressBase = computeAddressBase(relativeSymbols, linkedSymbols);

    const instructions = parseCLis(cLis, SOURCE_FILE_NAME, sourceLines, addressBase);

    return {
      success: diagnostics.every((d) => d.severity !== "error"),
      diagnostics,
      instructions,
      sourceLines,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
    release();
  }
}

function runZcc(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      config.zccExe,
      args,
      {
        cwd,
        env: {
          PATH: `${path.join(config.z88dkHome, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
          ZCCCFG: config.zccCfg,
        },
        timeout: config.compileTimeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
      (_error, stdout, stderr) => {
        // We intentionally ignore the error/exit code here: a non-zero exit
        // just means the user's C code failed to compile, which is reported
        // back as diagnostics rather than an HTTP-level failure.
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    );
  });
}
