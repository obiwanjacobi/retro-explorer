export interface CompileTarget {
  /** Unique id used in the API request, e.g. "zx". Must be unique across all toolchains. */
  id: string;
  /** Human readable label for the UI. */
  label: string;
  /** Id of the toolchain this target belongs to, e.g. "z88dk". */
  toolchainId: string;
}

export interface Diagnostic {
  severity: "error" | "warning";
  message: string;
  file?: string;
  line?: number;
}

export interface AsmInstruction {
  /** 1-based C source line this instruction was generated from, if known. */
  sourceLine: number | null;
  /** True final linked address in the target's memory map, as a 4-digit hex string (no prefix). */
  address: string;
  /** Instruction bytes as a hex string, e.g. "210400". */
  bytes: string;
  /** Assembly mnemonic + operands, e.g. "ld hl,4". */
  mnemonic: string;
  /** Trailing comment emitted by the compiler for this instruction, if any. */
  comment: string | null;
  /** T-state cycle count. A string like "12/17" is used for conditional instructions. */
  cycles: string | null;
}

/** A line of raw C source, echoed back so the client can render it alongside the asm without trusting its own editor buffer. */
export interface SourceLine {
  line: number;
  text: string;
}

export interface CompileResponse {
  success: boolean;
  diagnostics: Diagnostic[];
  instructions: AsmInstruction[];
  sourceLines: SourceLine[];
}

/** Thrown for invalid user input (bad target, source too large, etc). Caught by the route and returned as HTTP 400. */
export class CompileRequestError extends Error {}

/**
 * A pluggable C-to-Z80 compiler backend (z88dk, sdcc, ...). Each toolchain
 * owns its own target list and knows how to turn C source into a
 * `CompileResponse`; everything generic (request validation, concurrency
 * limiting, routing) lives outside of it.
 */
export interface Toolchain {
  /** Unique id, e.g. "z88dk". */
  id: string;
  /** Human readable label for the UI. */
  label: string;
  /** Compile targets this toolchain exposes. Target ids must be globally unique. */
  targets: CompileTarget[];
  compile(source: string, targetId: string): Promise<CompileResponse>;
}
