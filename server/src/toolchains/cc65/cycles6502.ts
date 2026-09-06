/**
 * NMOS 6502 instruction timing (cycles), keyed by raw opcode byte.
 *
 * These are the standard, publicly documented 6502 CPU cycle counts (as
 * published in numerous public 6502 opcode references). They are factual
 * technical specifications, not creative content, and apply to any 6502
 * assembly output regardless of which compiler toolchain produced it.
 *
 * Only the official (legal/documented) opcodes are covered - matches the
 * same "documented subset" choice already made for the Z80 timing table.
 * Conditional branches are returned as "taken/notTaken"; the extra +1 cycle
 * some instructions incur when a page boundary is crossed is not modeled
 * (same approximation already accepted for the Z80 table).
 */

const cycles = new Array<number | [number, number] | undefined>(256).fill(undefined);

function set(opcodes: number[], value: number | [number, number]) {
  for (const op of opcodes) cycles[op] = value;
}

// Implied / register single-byte instructions (2 cycles).
set(
  [0x18, 0x38, 0x58, 0x78, 0xb8, 0xd8, 0xf8, 0xea, 0xaa, 0x8a, 0xa8, 0x98, 0xba, 0x9a, 0xca, 0x88, 0xe8, 0xc8],
  2
); // CLC SEC CLI SEI CLV CLD SED NOP TAX TXA TAY TYA TSX TXS DEX DEY INX INY
set([0x0a, 0x2a, 0x4a, 0x6a], 2); // ASL/ROL/LSR/ROR A

// Stack.
set([0x48, 0x08], 3); // PHA PHP
set([0x68, 0x28], 4); // PLA PLP
set([0x60, 0x40], 6); // RTS RTI
set([0x00], 7); // BRK
set([0x20], 6); // JSR abs
set([0x4c], 3); // JMP abs
set([0x6c], 5); // JMP (ind)

// Conditional branches: [taken, not taken] (extra +1 if the branch crosses a page, not modeled).
set([0x10, 0x30, 0x50, 0x70, 0x90, 0xb0, 0xd0, 0xf0], [3, 2]); // BPL BMI BVC BVS BCC BCS BNE BEQ

/** ORA/AND/EOR/ADC/CMP/SBC family - opcode = (aaa<<5)|(bbb<<2)|01. */
function setAluFamily(base: number) {
  set([base + 0x01], 6); // (zp,X)
  set([base + 0x05], 3); // zp
  set([base + 0x09], 2); // imm
  set([base + 0x0d], 4); // abs
  set([base + 0x11], [6, 5]); // (zp),Y  [page-crossed, not-crossed]
  set([base + 0x15], 4); // zp,X
  set([base + 0x19], [5, 4]); // abs,Y
  set([base + 0x1d], [5, 4]); // abs,X
}
[0x00, 0x20, 0x40, 0x60, 0xc0, 0xe0].forEach(setAluFamily); // ORA AND EOR ADC CMP SBC

// LDA shares the ALU addressing-mode cycle costs.
setAluFamily(0xa0);

// STA: same addressing modes as LDA but no immediate, and stores never get the "not crossed" early-out.
set([0x81], 6); // (zp,X)
set([0x85], 3); // zp
set([0x8d], 4); // abs
set([0x91], 6); // (zp),Y
set([0x95], 4); // zp,X
set([0x99], 5); // abs,Y
set([0x9d], 5); // abs,X

// LDX/LDY/CPX/CPY immediate, zp, abs, and indexed variants.
set([0xa2], 2); // LDX imm
set([0xa6], 3); // LDX zp
set([0xb6], 4); // LDX zp,Y
set([0xae], 4); // LDX abs
set([0xbe], [5, 4]); // LDX abs,Y
set([0xa0], 2); // LDY imm
set([0xa4], 3); // LDY zp
set([0xb4], 4); // LDY zp,X
set([0xac], 4); // LDY abs
set([0xbc], [5, 4]); // LDY abs,X
set([0x86], 3); // STX zp
set([0x96], 4); // STX zp,Y
set([0x8e], 4); // STX abs
set([0x84], 3); // STY zp
set([0x94], 4); // STY zp,X
set([0x8c], 4); // STY abs
set([0xe0], 2); // CPX imm
set([0xe4], 3); // CPX zp
set([0xec], 4); // CPX abs
set([0xc0], 2); // CPY imm
set([0xc4], 3); // CPY zp
set([0xcc], 4); // CPY abs

// BIT.
set([0x24], 3); // zp
set([0x2c], 4); // abs

// INC/DEC (read-modify-write memory).
set([0xe6, 0xc6], 5); // zp (INC/DEC)
set([0xf6, 0xd6], 6); // zp,X
set([0xee, 0xce], 6); // abs
set([0xfe, 0xde], 7); // abs,X

// ASL/LSR/ROL/ROR memory (read-modify-write).
set([0x06, 0x46, 0x26, 0x66], 5); // zp
set([0x16, 0x56, 0x36, 0x76], 6); // zp,X
set([0x0e, 0x4e, 0x2e, 0x6e], 6); // abs
set([0x1e, 0x5e, 0x3e, 0x7e], 7); // abs,X

/**
 * Looks up the cycle count for an instruction given its raw opcode bytes
 * (only the first/opcode byte is used). Returns "taken/notTaken" for
 * conditional branches, a plain number otherwise, or null if unknown.
 */
export function cyclesFor6502(bytes: readonly number[]): string | null {
  if (bytes.length === 0) return null;
  const entry = cycles[bytes[0]];
  if (entry === undefined) return null;
  return Array.isArray(entry) ? `${entry[0]}/${entry[1]}` : String(entry);
}

export function hexBytesToArray(hex: string): number[] {
  const result: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    result.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return result;
}
