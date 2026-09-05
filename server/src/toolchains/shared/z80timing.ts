/**
 * Z80 instruction timing (T-states) table, keyed by raw opcode bytes.
 *
 * These are the standard, publicly documented Z80 CPU timings (as published
 * e.g. in the Zilog Z80 CPU User Manual). They are factual technical
 * specifications, not creative content, and apply to any Z80 assembly output
 * regardless of which compiler toolchain produced it.
 *
 * For conditional instructions (JR cc, JP cc is NOT conditional in timing,
 * CALL cc, RET cc, DJNZ) the result is returned as "taken/notTaken".
 */

/** Base (unprefixed) opcode table. Index = opcode byte (0x00-0xFF). */
const base = new Array<number | [number, number] | undefined>(256).fill(undefined);
/** Whether the base opcode references HL/(HL), and therefore behaves
 * differently under a DD/FD (IX/IY) prefix instead of just +4. */
const baseHLRef = new Array<"reg" | "mem" | undefined>(256).fill(undefined);

function setRange(startOpcode: number, step: number, count: number, value: number) {
  for (let i = 0; i < count; i++) base[startOpcode + i * step] = value;
}

// x=0 block (0x00-0x3F)
base[0x00] = 4; // NOP
base[0x08] = 4; // EX AF,AF'
base[0x10] = [13, 8]; // DJNZ e
base[0x18] = 12; // JR e
base[0x20] = [12, 7]; // JR NZ,e
base[0x28] = [12, 7]; // JR Z,e
base[0x30] = [12, 7]; // JR NC,e
base[0x38] = [12, 7]; // JR C,e

setRange(0x01, 0x10, 4, 10); // LD rp,nn (01,11,21,31)
setRange(0x09, 0x10, 4, 11); // ADD HL,rp (09,19,29,39)
baseHLRef[0x09] = baseHLRef[0x19] = baseHLRef[0x29] = baseHLRef[0x39] = "reg";

base[0x02] = 7; // LD (BC),A
base[0x12] = 7; // LD (DE),A
base[0x22] = 16; // LD (nn),HL
baseHLRef[0x22] = "reg";
base[0x32] = 13; // LD (nn),A
base[0x0a] = 7; // LD A,(BC)
base[0x1a] = 7; // LD A,(DE)
base[0x2a] = 16; // LD HL,(nn)
baseHLRef[0x2a] = "reg";
base[0x3a] = 13; // LD A,(nn)

setRange(0x03, 0x10, 4, 6); // INC rp (03,13,23,33)
baseHLRef[0x23] = "reg";
setRange(0x0b, 0x10, 4, 6); // DEC rp (0b,1b,2b,3b)
baseHLRef[0x2b] = "reg";

// INC r (04,0c,14,1c,24,2c,34,3c) - 34 is INC (HL) = 11
for (const op of [0x04, 0x0c, 0x14, 0x1c, 0x24, 0x2c, 0x3c]) base[op] = 4;
base[0x34] = 11;
baseHLRef[0x34] = "mem";
// DEC r (05,0d,15,1d,25,2d,35,3d) - 35 is DEC (HL) = 11
for (const op of [0x05, 0x0d, 0x15, 0x1d, 0x25, 0x2d, 0x3d]) base[op] = 4;
base[0x35] = 11;
baseHLRef[0x35] = "mem";
// LD r,n (06,0e,16,1e,26,2e,36,3e) - 36 is LD (HL),n = 10
for (const op of [0x06, 0x0e, 0x16, 0x1e, 0x26, 0x2e, 0x3e]) base[op] = 7;
base[0x36] = 10;
baseHLRef[0x36] = "mem";

for (const op of [0x07, 0x0f, 0x17, 0x1f, 0x27, 0x2f, 0x37, 0x3f]) base[op] = 4; // RLCA/RRCA/RLA/RRA/DAA/CPL/SCF/CCF

// x=1 block (0x40-0x7F): LD y,z (0x76 = HALT)
for (let y = 0; y < 8; y++) {
  for (let z = 0; z < 8; z++) {
    const op = 0x40 + y * 8 + z;
    if (op === 0x76) {
      base[op] = 4; // HALT
      continue;
    }
    const usesHL = y === 6 || z === 6;
    base[op] = usesHL ? 7 : 4;
    if (usesHL) baseHLRef[op] = "mem";
  }
}

// x=2 block (0x80-0xBF): ALU A,z
for (let y = 0; y < 8; y++) {
  for (let z = 0; z < 8; z++) {
    const op = 0x80 + y * 8 + z;
    base[op] = z === 6 ? 7 : 4;
    if (z === 6) baseHLRef[op] = "mem";
  }
}

// x=3 block (0xC0-0xFF)
for (const op of [0xc0, 0xc8, 0xd0, 0xd8, 0xe0, 0xe8, 0xf0, 0xf8]) base[op] = [11, 5]; // RET cc
for (const op of [0xc1, 0xd1, 0xe1, 0xf1]) base[op] = 10; // POP rp
baseHLRef[0xe1] = "reg";
for (const op of [0xc2, 0xca, 0xd2, 0xda, 0xe2, 0xea, 0xf2, 0xfa]) base[op] = 10; // JP cc,nn
base[0xc9] = 10; // RET
base[0xd9] = 4; // EXX
base[0xe9] = 4; // JP (HL)
baseHLRef[0xe9] = "reg";
base[0xf9] = 6; // LD SP,HL
baseHLRef[0xf9] = "reg";
base[0xc3] = 10; // JP nn
base[0xd3] = 11; // OUT (n),A
base[0xdb] = 11; // IN A,(n)
base[0xe3] = 19; // EX (SP),HL
baseHLRef[0xe3] = "reg";
base[0xeb] = 4; // EX DE,HL
base[0xf3] = 4; // DI
base[0xfb] = 4; // EI
for (const op of [0xc4, 0xcc, 0xd4, 0xdc, 0xe4, 0xec, 0xf4, 0xfc]) base[op] = [17, 10]; // CALL cc,nn
for (const op of [0xc5, 0xd5, 0xe5, 0xf5]) base[op] = 11; // PUSH rp
baseHLRef[0xe5] = "reg";
base[0xcd] = 17; // CALL nn
for (const op of [0xc6, 0xce, 0xd6, 0xde, 0xe6, 0xee, 0xf6, 0xfe]) base[op] = 7; // ALU A,n
for (const op of [0xc7, 0xcf, 0xd7, 0xdf, 0xe7, 0xef, 0xf7, 0xff]) base[op] = 11; // RST p

// DD/FD (IX/IY) overrides for opcodes that address memory via (IX+d)/(IY+d):
// these are not simply "+4" because a displacement byte must be fetched.
const dispOverride = new Map<number, number>([
  [0x34, 23], // INC (IX+d)
  [0x35, 23], // DEC (IX+d)
  [0x36, 19], // LD (IX+d),n
  [0x46, 19], [0x4e, 19], [0x56, 19], [0x5e, 19], [0x66, 19], [0x6e, 19], [0x7e, 19], // LD r,(IX+d)
  [0x70, 19], [0x71, 19], [0x72, 19], [0x73, 19], [0x74, 19], [0x75, 19], [0x77, 19], // LD (IX+d),r
  [0x86, 19], [0x8e, 19], [0x96, 19], [0x9e, 19], [0xa6, 19], [0xae, 19], [0xb6, 19], [0xbe, 19], // ALU A,(IX+d)
]);

function baseCycles(opcode: number, prefixed: boolean): [number, number] | null {
  const entry = base[opcode];
  if (entry === undefined) return null;
  if (prefixed) {
    const override = dispOverride.get(opcode);
    if (override !== undefined) return [override, override];
    const ref = baseHLRef[opcode];
    if (ref === "reg") {
      const t = Array.isArray(entry) ? entry : [entry, entry];
      return [t[0] + 4, t[1] + 4];
    }
    if (ref === "mem") {
      // Any (HL)-memory opcode not covered by dispOverride shouldn't occur in
      // practice for DD/FD, but fall back to +12 (matches the documented delta).
      const t = Array.isArray(entry) ? entry : [entry, entry];
      return [t[0] + 12, t[1] + 12];
    }
    // Opcode doesn't reference H/L: DD/FD prefix is effectively wasted, +4 for the prefix fetch.
    const t = Array.isArray(entry) ? entry : [entry, entry];
    return [t[0] + 4, t[1] + 4];
  }
  const t = Array.isArray(entry) ? entry : [entry, entry];
  return [t[0], t[1]];
}

function cbCycles(opcode: number): number {
  const z = opcode & 0x07;
  const x = opcode >> 6;
  if (x === 1) return z === 6 ? 12 : 8; // BIT b,(HL) vs BIT b,r
  return z === 6 ? 15 : 8; // RLC/RRC/RL/RR/SLA/SRA/SLL/SRL and SET/RES on (HL) vs r
}

function cbDispCycles(opcode: number): number {
  const x = opcode >> 6;
  return x === 1 ? 20 : 23; // BIT b,(IX+d) vs rotate/shift/SET/RES (IX+d)
}

/** Selected documented ED-prefixed opcode timings. */
const edCycles = new Map<number, number | [number, number]>([
  [0x40, 12], [0x48, 12], [0x50, 12], [0x58, 12], [0x60, 12], [0x68, 12], [0x70, 12], [0x78, 12], // IN r,(C)
  [0x41, 12], [0x49, 12], [0x51, 12], [0x59, 12], [0x61, 12], [0x69, 12], [0x71, 12], [0x79, 12], // OUT (C),r
  [0x42, 15], [0x52, 15], [0x62, 15], [0x72, 15], // SBC HL,rp
  [0x4a, 15], [0x5a, 15], [0x6a, 15], [0x7a, 15], // ADC HL,rp
  [0x43, 20], [0x53, 20], [0x63, 20], [0x73, 20], // LD (nn),rp
  [0x4b, 20], [0x5b, 20], [0x6b, 20], [0x7b, 20], // LD rp,(nn)
  [0x44, 8], [0x4c, 8], [0x54, 8], [0x5c, 8], [0x64, 8], [0x6c, 8], [0x74, 8], [0x7c, 8], // NEG
  [0x45, 14], [0x55, 14], [0x65, 14], [0x75, 14], // RETN
  [0x4d, 14], [0x5d, 14], [0x6d, 14], [0x7d, 14], // RETI
  [0x46, 8], [0x4e, 8], [0x66, 8], [0x6e, 8], // IM 0
  [0x56, 8], [0x76, 8], // IM 1
  [0x5e, 8], [0x7e, 8], // IM 2
  [0x47, 9], // LD I,A
  [0x4f, 9], // LD R,A
  [0x57, 9], // LD A,I
  [0x5f, 9], // LD A,R
  [0x67, 18], // RRD
  [0x6f, 18], // RLD
  [0xa0, 16], [0xa8, 16], // LDI/LDD
  [0xa1, 16], [0xa9, 16], // CPI/CPD
  [0xa2, 16], [0xaa, 16], // INI/IND
  [0xa3, 16], [0xab, 16], // OUTI/OUTD
  [0xb0, [21, 16]], [0xb8, [21, 16]], // LDIR/LDDR
  [0xb1, [21, 16]], [0xb9, [21, 16]], // CPIR/CPDR
  [0xb2, [21, 16]], [0xba, [21, 16]], // INIR/INDR
  [0xb3, [21, 16]], [0xbb, [21, 16]], // OTIR/OTDR
]);

/**
 * Returns the cycle count string for an instruction given its raw bytes,
 * e.g. "12" or "17/10" (taken/not-taken) for conditional instructions.
 * Returns null if the opcode isn't recognised.
 */
export function cyclesForBytes(bytes: readonly number[]): string | null {
  let i = 0;
  let prefixed = false;
  if (bytes[0] === 0xdd || bytes[0] === 0xfd) {
    prefixed = true;
    i = 1;
  }

  const op = bytes[i];
  if (op === undefined) return null;

  if (op === 0xcb) {
    if (prefixed) {
      // DD CB d op / FD CB d op
      const subOp = bytes[i + 2];
      if (subOp === undefined) return null;
      return String(cbDispCycles(subOp));
    }
    const subOp = bytes[i + 1];
    if (subOp === undefined) return null;
    return String(cbCycles(subOp));
  }

  if (op === 0xed) {
    const subOp = bytes[i + 1];
    if (subOp === undefined) return null;
    const entry = edCycles.get(subOp);
    if (entry === undefined) return null;
    return Array.isArray(entry) ? `${entry[0]}/${entry[1]}` : String(entry);
  }

  const result = baseCycles(op, prefixed);
  if (result === null) return null;
  const [taken, notTaken] = result;
  return taken === notTaken ? String(taken) : `${taken}/${notTaken}`;
}

/** Parses a hex byte string like "210400" into [0x21, 0x04, 0x00]. */
export function hexBytesToArray(hex: string): number[] {
  const clean = hex.trim();
  const out: number[] = [];
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}
