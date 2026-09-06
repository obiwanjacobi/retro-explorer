export interface Cpu {
  id: string;
  label: string;
}

/** Static list of CPU families exposed in the UI, independent of which toolchains support them. */
export const CPUS: Cpu[] = [
  { id: "z80", label: "Zilog Z80" },
  { id: "6502", label: "MOS 6502" },
];
