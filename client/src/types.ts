export interface CompileTarget {
  id: string;
  label: string;
  toolchainId: string;
  cpuId: string;
  clibs?: CompilerOption[];
}

export interface Toolchain {
  id: string;
  label: string;
  cpus: string[];
  version: string;
  compilers: CompilerOption[];
}

export interface CompilerOption {
  id: string;
  label: string;
}

export interface Cpu {
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
  sourceLine: number | null;
  address: string;
  bytes: string;
  mnemonic: string;
  comment: string | null;
  cycles: string | null;
}

export interface SourceLine {
  line: number;
  text: string;
}

export interface CompileResponse {
  success: boolean;
  diagnostics: Diagnostic[];
  instructions: AsmInstruction[];
  sourceLines: SourceLine[];
  compileTimeMs: number;
}

/** An inclusive 1-based line range, used for reporting stats on a user's editor text selection. */
export interface LineRange {
  start: number;
  end: number;
}
