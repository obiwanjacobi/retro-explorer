import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config.js";
import { readIfExists, toSourceLines, withTempWorkspace } from "../shared/workspace.js";
import type { CompileResponse } from "../types.js";
import { cc65Config } from "./config.js";
import { parseCc65Diagnostics, parseCc65Listing, parseViceLabels } from "./listing.js";

const SOURCE_FILE_NAME = "main.c";
const OUTPUT_NAME = "main";

function runCl65(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      cc65Config.cl65Exe,
      args,
      {
        cwd,
        env: {
          PATH: `${path.join(cc65Config.cc65Home, "bin")}${path.delimiter}${process.env.PATH ?? ""}`,
          CC65_HOME: cc65Config.cc65Home,
        },
        timeout: config.compileTimeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
      (_error, stdout, stderr) => {
        // Non-zero exit just means the user's C code failed to compile; reported as diagnostics, not an HTTP failure.
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    );
  });
}

/** Compiles C source with cl65 (cc65) for the given `-t` target system, with an optional `-O`/`-Oi`/`-Or`/`-Os` optimization flag. */
export async function compileWithCc65(
  source: string,
  ccTarget: string,
  optLevel?: string
): Promise<Omit<CompileResponse, "compileTimeMs">> {
  return withTempWorkspace("cc65web-", async (tmpDir) => {
    const sourcePath = path.join(tmpDir, SOURCE_FILE_NAME);
    await fs.writeFile(sourcePath, source, "utf8");

    const args = [
      "-t",
      ccTarget,
      ...(optLevel ? [`-${optLevel}`] : []),
      "-g",
      "-T",
      "-l",
      `${OUTPUT_NAME}.lst`,
      "-Ln",
      `${OUTPUT_NAME}.vice`,
      "-o",
      `${OUTPUT_NAME}.bin`,
      SOURCE_FILE_NAME,
    ];

    const commandLine = ["cl65", ...args].join(" ");

    const { stdout, stderr } = await runCl65(args, tmpDir);
    const combinedOutput = `${stdout}\n${stderr}`.split(tmpDir).join("").split(sourcePath).join(SOURCE_FILE_NAME);
    const diagnostics = parseCc65Diagnostics(combinedOutput);

    const sourceLines = toSourceLines(source);
    const lst = await readIfExists(path.join(tmpDir, `${OUTPUT_NAME}.lst`));
    const vice = await readIfExists(path.join(tmpDir, `${OUTPUT_NAME}.vice`));
    let binary: Buffer | null = null;
    try {
      binary = await fs.readFile(path.join(tmpDir, `${OUTPUT_NAME}.bin`));
    } catch {
      binary = null;
    }

    if (!lst || !vice || !binary) {
      return {
        success: false,
        diagnostics:
          diagnostics.length > 0 ? diagnostics : [{ severity: "error" as const, message: combinedOutput.trim() || "Compilation failed." }],
        instructions: [],
        sourceLines,
        commandLine,
      };
    }

    const viceLabels = parseViceLabels(vice);
    const instructions = parseCc65Listing(lst, viceLabels, binary);

    return {
      success: diagnostics.every((d) => d.severity !== "error"),
      diagnostics,
      instructions,
      sourceLines,
      commandLine,
    };
  });
}
