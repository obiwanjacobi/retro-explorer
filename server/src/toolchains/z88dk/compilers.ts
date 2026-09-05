export interface Z88dkCompiler {
  id: string;
  label: string;
}

/** The C front-end compilers bundled with z88dk; passed via zcc's `-compiler=` flag. */
export const Z88DK_COMPILERS: Z88dkCompiler[] = [
  { id: "sccz80", label: "SCCZ80 (default)" },
  { id: "sdcc", label: "SDCC" },
];

export function resolveZ88dkCompiler(id: string): Z88dkCompiler | undefined {
  return Z88DK_COMPILERS.find((c) => c.id === id);
}
