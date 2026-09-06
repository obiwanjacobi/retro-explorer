import type { AsmInstruction, LineRange } from "../types";

interface Props {
  instructions: AsmInstruction[];
  citeRange: LineRange | null;
  asmRange: LineRange | null;
  compileTimeMs: number | null;
}

/** Parses a cycles string like "12" or "17/10" (taken/not-taken), returning the taken (worst-case) value. */
function parseCycles(cycles: string | null): number | null {
  if (cycles === null) return null;
  const [taken] = cycles.split("/");
  const n = Number(taken);
  return Number.isFinite(n) ? n : null;
}

export function StatusBar({ instructions, citeRange, asmRange, compileTimeMs }: Props) {
  let scoped: AsmInstruction[];
  let scopeLabel: string;

  if (asmRange !== null) {
    scoped = instructions.slice(asmRange.start, asmRange.end + 1);
    scopeLabel = asmRange.start === asmRange.end ? "line" : "selection";
  } else if (citeRange !== null) {
    const matched = instructions.filter(
      (i) => i.sourceLine !== null && i.sourceLine >= citeRange.start && i.sourceLine <= citeRange.end
    );
    if (matched.length > 0) {
      scoped = matched;
      scopeLabel = citeRange.start === citeRange.end ? "line" : "selection";
    } else {
      // Cursor/selection is on a line that doesn't directly correspond to any asm (e.g. a brace or blank line).
      scoped = instructions;
      scopeLabel = "program";
    }
  } else {
    scoped = instructions;
    scopeLabel = "program";
  }

  const bytes = scoped.reduce((sum, i) => sum + i.bytes.length / 2, 0);
  let cycles = 0;
  let hasUnknownCycles = false;
  for (const i of scoped) {
    const n = parseCycles(i.cycles);
    if (n === null) hasUnknownCycles = true;
    else cycles += n;
  }

  return (
    <footer className="status-bar">
      <span>Compile time: {compileTimeMs !== null ? `${compileTimeMs} ms` : "—"}</span>
      <span>
        Bytes ({scopeLabel}): {scoped.length > 0 ? bytes : "—"}
      </span>
      <span>
        Cycles ({scopeLabel}): {scoped.length > 0 ? `${hasUnknownCycles ? "≥" : ""}${cycles}` : "—"}
      </span>
    </footer>
  );
}
