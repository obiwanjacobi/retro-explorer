import type { AsmInstruction, LineRange } from "../types";

interface Props {
  instructions: AsmInstruction[];
  selectionRange: LineRange | null;
  compileTimeMs: number | null;
}

/** Parses a cycles string like "12" or "17/10" (taken/not-taken), returning the taken (worst-case) value. */
function parseCycles(cycles: string | null): number | null {
  if (cycles === null) return null;
  const [taken] = cycles.split("/");
  const n = Number(taken);
  return Number.isFinite(n) ? n : null;
}

export function StatusBar({ instructions, selectionRange, compileTimeMs }: Props) {
  const scoped = selectionRange
    ? instructions.filter((i) => i.sourceLine !== null && i.sourceLine >= selectionRange.start && i.sourceLine <= selectionRange.end)
    : instructions;

  const bytes = scoped.reduce((sum, i) => sum + i.bytes.length / 2, 0);
  let cycles = 0;
  let hasUnknownCycles = false;
  for (const i of scoped) {
    const n = parseCycles(i.cycles);
    if (n === null) hasUnknownCycles = true;
    else cycles += n;
  }

  const scopeLabel = selectionRange === null ? "program" : selectionRange.start === selectionRange.end ? "line" : "selection";

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
