import type { Cpu } from "../types.js";

/**
 * zcc's whole "CPU Targetting" section (`zcc --help`, z88dk v23854) - each entry corresponds 1:1
 * to one of its `-m<cpu>` flags, which z88dk's target config files pin per clib or per target (see
 * `clibDiscovery.ts`). Deliberately excluded: `-mz80_ixiy`/`-mz80_strict` are compiler codegen
 * conventions for the SAME z80 silicon, not distinct CPUs; `-mz80n`/`-mgbz80` name a machine (ZX
 * Spectrum Next / Game Boy, already their own "zxn"/"gb" targets), not a CPU - all of these fall
 * back to "z80".
 */
export const Z88DK_CPUS: Cpu[] = [
  { id: "z80", label: "Zilog Z80" },
  { id: "z180", label: "Zilog Z180" },
  { id: "ez80_z80", label: "eZ80 (Z80 mode)" },
  { id: "kc160", label: "KC160" },
  { id: "8080", label: "Intel 8080" },
  { id: "8085", label: "Intel 8085" },
  { id: "r2ka", label: "Rabbit 2000" },
  { id: "r3k", label: "Rabbit 3000" },
  { id: "r4k", label: "Rabbit 4000" },
  { id: "r6k", label: "Rabbit 6000" },
];
