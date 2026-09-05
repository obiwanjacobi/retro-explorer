export interface CompileTarget {
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
}
