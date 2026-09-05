import { cyclesForBytes, hexBytesToArray } from "../shared/z80timing.js";
import type { AsmInstruction, Diagnostic, SourceLine } from "../types.js";

const INSTRUCTION_ROW = /^\s*\d+\s+([0-9a-fA-F]{4})\s+([0-9a-fA-F]+)\s+(.*)$/;
const NUMBERED_ROW = /^\s*\d+\s+(.*)$/;
const FILE_TRANSITION = /^(\S.*):\s*$/;
const SYMBOL_ROW = /^(\S+)\s*=\s*\$([0-9a-fA-F]+)\s*;/;

/**
 * Parses `<file>.c.sym` or `.map` output, mapping symbol name -> address.
 */
export function parseSymbolAddresses(text: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const m = SYMBOL_ROW.exec(line);
    if (m) result.set(m[1], parseInt(m[2], 16));
  }
  return result;
}

/**
 * Computes the offset to convert module-relative addresses (as emitted in the
 * per-file .lis listing) into true, final linked addresses, by comparing a
 * symbol's relative address (from .c.sym) against its resolved address
 * (from .map). Falls back to 0 (relative addresses) if no symbol is common
 * to both maps.
 */
export function computeAddressBase(
  relativeSymbols: Map<string, number>,
  linkedSymbols: Map<string, number>
): number {
  for (const [name, relativeAddr] of relativeSymbols) {
    const linkedAddr = linkedSymbols.get(name);
    if (linkedAddr !== undefined) return linkedAddr - relativeAddr;
  }
  return 0;
}

function toHex4(n: number): string {
  return (n & 0xffff).toString(16).padStart(4, "0");
}

const RESERVED_OPERAND_WORDS = new Set([
  "a", "b", "c", "d", "e", "h", "l", "i", "r",
  "af", "bc", "de", "hl", "sp", "ix", "iy",
  "ixh", "ixl", "iyh", "iyl",
  "nz", "z", "nc", "po", "pe", "p", "m",
]);

/**
 * The per-module .lis listing is generated before cross-module linking, so
 * any instruction referencing an external symbol (a call/jp target, or a
 * global variable address) is emitted with a placeholder "0000" operand.
 * This patches that placeholder with the symbol's real linked address (from
 * the .map file) so the displayed bytes match the address shown for the
 * symbol's own definition.
 */
function resolveUnlinkedOperand(
  mnemonic: string,
  bytesHex: string,
  linkedSymbols: Map<string, number>
): string {
  if (!bytesHex.toLowerCase().endsWith("0000")) return bytesHex;

  const spaceIdx = mnemonic.indexOf(" ");
  const operandsStr = spaceIdx === -1 ? "" : mnemonic.slice(spaceIdx + 1);
  const candidates = (operandsStr.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).filter(
    (tok) => !RESERVED_OPERAND_WORDS.has(tok.toLowerCase())
  );
  if (candidates.length !== 1) return bytesHex;

  const address = linkedSymbols.get(candidates[0]);
  if (address === undefined) return bytesHex;

  const lo = (address & 0xff).toString(16).padStart(2, "0");
  const hi = ((address >> 8) & 0xff).toString(16).padStart(2, "0");
  return bytesHex.slice(0, -4) + lo + hi;
}

/**
 * Parses a `<file>.c.lis` listing (produced with --list --c-code-in-asm) for
 * the given source file name, extracting per-instruction address/bytes/
 * mnemonic plus the originating C source line (matched by comparing the
 * compiler's inlined source-echo comments against the actual source text).
 */
export function parseCLis(
  lisText: string,
  sourceFileName: string,
  sourceLines: SourceLine[],
  addressBase: number,
  linkedSymbols: Map<string, number>
): AsmInstruction[] {
  const nonBlank = sourceLines.filter((l) => l.text.trim().length > 0);
  let sourcePointer = 0;
  let currentSourceLine: number | null = null;
  let inTargetFile = false;

  const instructions: AsmInstruction[] = [];

  for (const rawLine of lisText.split(/\r?\n/)) {
    if (rawLine.trim().length === 0) continue;

    const transition = FILE_TRANSITION.exec(rawLine);
    if (transition && !NUMBERED_ROW.test(rawLine)) {
      const marker = transition[1];
      if (!marker.includes("::")) {
        const basename = marker.split(/[\\/]/).pop() ?? marker;
        inTargetFile = basename === sourceFileName;
      }
      continue;
    }

    if (!inTargetFile) continue;

    const instrMatch = INSTRUCTION_ROW.exec(rawLine);
    if (instrMatch) {
      const [, relAddrHex, rawBytesHex, rest] = instrMatch;
      const semiIdx = rest.indexOf(";");
      const mnemonic = (semiIdx === -1 ? rest : rest.slice(0, semiIdx)).trim().replace(/\s+/g, " ");
      const comment = semiIdx === -1 ? null : rest.slice(semiIdx + 1).trim() || null;
      const trueAddr = (parseInt(relAddrHex, 16) + addressBase) & 0xffff;
      const bytesHex = resolveUnlinkedOperand(mnemonic, rawBytesHex, linkedSymbols);
      instructions.push({
        sourceLine: currentSourceLine,
        address: toHex4(trueAddr),
        bytes: bytesHex.toLowerCase(),
        mnemonic,
        comment,
        cycles: cyclesForBytes(hexBytesToArray(bytesHex)),
      });
      continue;
    }

    // Comment-only rows (no address/bytes) may or may not carry a leading
    // line-number column depending on whether a C_LINE has been emitted yet,
    // so just look for a bare ';' anywhere after stripping leading whitespace
    // and an optional leading line number.
    const stripped = rawLine.replace(/^\s*\d*\s*/, "");
    if (stripped.startsWith(";")) {
      const echoed = stripped.slice(1).trim();
      const candidate = nonBlank[sourcePointer];
      if (candidate && echoed === candidate.text.trim()) {
        currentSourceLine = candidate.line;
        sourcePointer++;
      }
    }
  }

  return instructions;
}

const DIAGNOSTIC_ROW = /^(.*?):(?:(\d+):)?(?:\d+:)?\s*(fatal error|error|warning):\s*(.*)$/i;

/** Extracts compiler diagnostics (errors/warnings) from zcc's combined stdout+stderr output. */
export function parseDiagnostics(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const line of output.split(/\r?\n/)) {
    const m = DIAGNOSTIC_ROW.exec(line.trim());
    if (!m) continue;
    const [, file, lineNo, severity, message] = m;
    diagnostics.push({
      severity: severity.toLowerCase() === "warning" ? "warning" : "error",
      message,
      file: file.split(/[\\/]/).pop(),
      line: lineNo ? Number(lineNo) : undefined,
    });
  }
  return diagnostics;
}
