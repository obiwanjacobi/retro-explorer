import { cyclesFor6502, hexBytesToArray } from "./cycles6502.js";
import type { AsmInstruction, Diagnostic } from "../types.js";

// A ca65 listing row: <6-hex addr><r?> <level>  <byte tokens><optional label><mnemonic/operand text>.
// The byte-token field is fixed-width and tab/space usage between the fields is inconsistent between
// directive lines (e.g. ".proc") and real instructions, so we tokenize by whitespace (tabs included)
// rather than relying on a fixed tab position. See `parseCc65Listing` doc comment for why we don't
// trust the byte token VALUES themselves.
const PREFIX = /^([0-9A-Fa-f]{6})r?\s+\d+\s+(.*)$/;
const BYTE_TOKEN = /^(?:[0-9A-Fa-f]{2}|rr)$/;
const DBG_LINE = /^\.dbg\s+line,\s*"([^"]*)",\s*(\d+)/;
const PROC = /^\.proc\s+(\S+?):/;

interface RawRow {
  relativeAddress: number;
  byteCount: number;
  mnemonic: string;
  sourceLine: number | null;
}

/**
 * Parses a ca65 listing (`cl65 -g -T -l`) into raw instruction rows: relative
 * (module-local) address, byte count, mnemonic text, and the C source line
 * it came from (via `.dbg line, "file", N` directives, which -g emits
 * exactly - no text-matching needed, unlike z88dk's sccz80 listings). Also
 * returns the true address of the first `.proc` (always at relative address
 * 0), used to compute the base for converting relative -> true addresses.
 *
 * The byte VALUES in the listing are deliberately NOT used: ca65 leaves any
 * operand referencing a relocatable symbol (calls to runtime lib routines,
 * even forward-referenced local labels) as "rr rr" placeholders, resolved
 * only by the linker. `compiler.ts` instead reads the real final bytes
 * straight out of the linked binary, using the true address computed from
 * these relative addresses.
 */
function parseRawRows(lstText: string): { rows: RawRow[]; firstProcName: string | null } {
  const rows: RawRow[] = [];
  let currentSourceLine: number | null = null;
  let firstProcName: string | null = null;

  for (const rawLine of lstText.split(/\r?\n/)) {
    const prefixMatch = PREFIX.exec(rawLine);
    if (!prefixMatch) continue;
    const [, addrHex, rest] = prefixMatch;

    const tokens = rest.replace(/\t/g, " ").trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tokens.length && BYTE_TOKEN.test(tokens[i])) i++;
    const byteCount = i;
    const remaining = tokens.slice(i);
    if (remaining[0]?.endsWith(":")) remaining.shift(); // drop a label like "L0001:"
    const content = remaining.join(" ");

    const dbgLine = DBG_LINE.exec(content);
    if (dbgLine) {
      currentSourceLine = Number(dbgLine[2]);
      continue;
    }
    if (/^\.dbg\s+line\s*$/.test(content)) {
      currentSourceLine = null;
      continue;
    }
    if (firstProcName === null) {
      const proc = PROC.exec(content);
      if (proc) firstProcName = proc[1];
    }
    if (byteCount === 0) continue; // directive/comment row, not an instruction

    rows.push({
      relativeAddress: parseInt(addrHex, 16),
      byteCount,
      mnemonic: content,
      sourceLine: currentSourceLine,
    });
  }
  return { rows, firstProcName };
}

/** `-Ln` VICE label file lines look like `al 0008C8 .pushax`; trivial name -> true address map. */
export function parseViceLabels(viceText: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const line of viceText.split(/\r?\n/)) {
    const m = /^al\s+([0-9A-Fa-f]+)\s+\.(\S+)/.exec(line);
    if (m) result.set(m[2], parseInt(m[1], 16));
  }
  return result;
}

/**
 * Turns raw listing rows into `AsmInstruction`s, reading the actual
 * instruction bytes from the linked binary (a `.prg`-style file: 2 byte
 * little-endian load address header, followed by the raw memory image).
 */
function buildInstructions(rows: RawRow[], addressBase: number, binary: Buffer): AsmInstruction[] {
  const loadAddress = binary.readUInt16LE(0);
  return rows.map((row) => {
    const trueAddress = (row.relativeAddress + addressBase) & 0xffff;
    const fileOffset = 2 + (trueAddress - loadAddress);
    const byteSlice = binary.subarray(fileOffset, fileOffset + row.byteCount);
    const bytesHex = byteSlice.toString("hex");
    return {
      sourceLine: row.sourceLine,
      address: trueAddress.toString(16).padStart(4, "0"),
      bytes: bytesHex,
      mnemonic: row.mnemonic,
      comment: null,
      cycles: cyclesFor6502(hexBytesToArray(bytesHex)),
    };
  });
}

export function parseCc65Listing(lstText: string, viceLabels: Map<string, number>, binary: Buffer): AsmInstruction[] {
  const { rows, firstProcName } = parseRawRows(lstText);
  // The first .proc in the file always starts at relative address 0, so its true address IS the base.
  const addressBase = (firstProcName ? viceLabels.get(firstProcName) : undefined) ?? 0;
  return buildInstructions(rows, addressBase, binary);
}

const DIAGNOSTIC_ROW = /^(.*?):(\d+):\s*(Error|Warning|Fatal Error):\s*(.*)$/i;

/** Extracts compiler diagnostics (errors/warnings) from cl65's combined stdout+stderr output. */
export function parseCc65Diagnostics(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const line of output.split(/\r?\n/)) {
    const m = DIAGNOSTIC_ROW.exec(line.trim());
    if (!m) continue;
    const [, file, lineNo, severity, message] = m;
    diagnostics.push({
      severity: severity.toLowerCase().includes("warning") ? "warning" : "error",
      message,
      file: file.split(/[\\/]/).pop(),
      line: Number(lineNo),
    });
  }
  return diagnostics;
}
