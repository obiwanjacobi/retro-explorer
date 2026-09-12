export interface Z88dkCompiler {
  id: string;
  label: string;
  /** CPU ids this compiler can NEVER be used with (see `toolchains/types.ts`'s `CompilerOption`). */
  unsupportedCpus?: string[];
}

/** The C front-end compilers bundled with z88dk; passed via zcc's `-compiler=` flag. */
export const Z88DK_COMPILERS: Z88dkCompiler[] = [
  { id: "sccz80", label: "SCCZ80" },
  // zsdcc's own supported-ports list has no 8080/8085 port - it refuses those clibs outright ("Selected CPU is not supported by zsdcc").
  { id: "sdcc", label: "ZSDCC", unsupportedCpus: ["8080", "8085"] },
];

export function resolveZ88dkCompiler(id: string): Z88dkCompiler | undefined {
  return Z88DK_COMPILERS.find((c) => c.id === id);
}
