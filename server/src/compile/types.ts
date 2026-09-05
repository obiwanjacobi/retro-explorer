export interface CompileRequest {
  source: string;
  targetId: string;
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
