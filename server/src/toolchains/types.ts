export interface CompileTarget {
  /** Unique id used in the API request, e.g. "zx". Must be unique across all toolchains. */
  id: string;
  /** Human readable label for the UI. */
  label: string;
  /** Id of the toolchain this target belongs to, e.g. "z88dk". */
  toolchainId: string;
  /** Id of the CPU this target runs on, e.g. "z80", "6502" (see `toolchains/cpus.ts`). */
  cpuId: string;
  /** Selectable C library variants for this target, if any (e.g. z88dk's "new"/"ansi"/"noclib"). */
  clibs?: CompilerOption[];
}

/** A selectable compiler backend within a toolchain, e.g. z88dk's "sccz80" vs "sdcc" front ends. */
export interface CompilerOption {
  id: string;
  label: string;
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
  /** Wall-clock time the compile took, in milliseconds. */
  compileTimeMs: number;
}

/** Thrown for invalid user input (bad target, source too large, etc). Caught by the route and returned as HTTP 400. */
export class CompileRequestError extends Error {}

/**
 * Per-compile choices a toolchain may support, beyond the target itself.
 * Each toolchain has its own HTTP route with its own zod schema (e.g.
 * `routes/z88dk.ts`, `routes/cc65.ts`) that validates and whitelists every
 * field of the actual request body before it ever reaches this generic bag -
 * this type is just the shape `Toolchain.compile()` receives internally, not
 * a raw pass-through of client input.
 */
export type CompileOptions = Record<string, string | undefined>;

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
  /** Ids of the CPUs this toolchain can target (see `toolchains/cpus.ts`); used to filter the platform picker by selected CPU. */
  cpus: string[];
  /** Compile targets this toolchain exposes. Target ids must be globally unique. */
  targets: CompileTarget[];
  /** Selectable compiler backends within this toolchain, if it has more than one (e.g. z88dk's sccz80/sdcc). */
  compilers?: CompilerOption[];
  /** `compileTimeMs` is filled in by `runCompile` and doesn't need to be returned here. */
  compile(source: string, targetId: string, options?: CompileOptions): Promise<Omit<CompileResponse, "compileTimeMs">>;
}
