import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config.js";
import { readIfExists, toSourceLines, withTempWorkspace } from "../shared/workspace.js";
import type { CompileResponse } from "../types.js";
import { z88dkConfig } from "./config.js";
import { computeAddressBase, parseCLis, parseDiagnostics, parseSymbolAddresses } from "./listParser.js";

const SOURCE_FILE_NAME = "main.c";

function runZcc(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      z88dkConfig.zccExe,
      args,
      {
        cwd,
        env: {
          PATH: `${path.join(z88dkConfig.z88dkHome, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
          ZCCCFG: z88dkConfig.zccCfg,
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

/** Compiles C source with zcc (z88dk) for the given `+target` flag, front-end compiler (sccz80/sdcc), and optional C library variant. */
export async function compileWithZ88dk(
  source: string,
  zccFlag: string,
  compilerId: string,
  clibId?: string,
  optLevel?: string
): Promise<Omit<CompileResponse, "compileTimeMs">> {
  return withTempWorkspace("z88dkweb-", async (tmpDir) => {
    const sourcePath = path.join(tmpDir, SOURCE_FILE_NAME);
    await fs.writeFile(sourcePath, source, "utf8");

    // sccz80's peephole optimiser level is `-O<n>`, sdcc's is `-SO<n>` - same 0-3 scale, different flag per front end.
    const optFlag = optLevel ? (compilerId === "sdcc" ? `-SO${optLevel}` : `-O${optLevel}`) : undefined;

    const args = [
      zccFlag,
      `-compiler=${compilerId}`,
      ...(clibId ? [`-clib=${clibId}`] : []),
      ...(optFlag ? [optFlag] : []),
      "--list",
      "--c-code-in-asm",
      "-m",
      "-s",
      "-no-cleanup",
      "-o",
      "main",
      SOURCE_FILE_NAME,
    ];

    const commandLine = ["zcc", ...args].join(" ");

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
        diagnostics: diagnostics.length > 0 ? diagnostics : [{ severity: "error" as const, message: combinedOutput.trim() || "Compilation failed." }],
        instructions: [],
        sourceLines,
        commandLine,
      };
    }

    const relativeSymbols = cSym ? parseSymbolAddresses(cSym) : new Map<string, number>();
    const linkedSymbols = map ? parseSymbolAddresses(map) : new Map<string, number>();
    const addressBase = computeAddressBase(relativeSymbols, linkedSymbols);

    const instructions = parseCLis(cLis, SOURCE_FILE_NAME, sourceLines, addressBase, linkedSymbols);

    return {
      success: diagnostics.every((d) => d.severity !== "error"),
      diagnostics,
      instructions,
      sourceLines,
      commandLine,
    };
  });
}
