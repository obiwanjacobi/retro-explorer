import type { AsmInstruction, LineRange } from "../types";

interface Props {
  instructions: AsmInstruction[];
  activeLine: number | null;
  selectionRange: LineRange | null;
  onHoverLine: (line: number | null) => void;
  onClickLine: (line: number | null) => void;
}

export function AsmView({ instructions, activeLine, selectionRange, onHoverLine, onClickLine }: Props) {
  if (instructions.length === 0) {
    return <div className="asm-empty">No assembly to show yet. Compile some code.</div>;
  }

  const isHighlighted = (line: number | null) => {
    if (line === null) return false;
    if (line === activeLine) return true;
    return selectionRange !== null && line >= selectionRange.start && line <= selectionRange.end;
  };

  return (
    <table className="asm-table">
      <thead>
        <tr>
          <th>Address</th>
          <th>Bytes</th>
          <th>Cycles</th>
          <th>Mnemonic</th>
        </tr>
      </thead>
      <tbody>
        {instructions.map((ins, i) => (
          <tr
            key={i}
            className={isHighlighted(ins.sourceLine) ? "asm-row active" : "asm-row"}
            onMouseEnter={() => onHoverLine(ins.sourceLine)}
            onClick={() => onClickLine(ins.sourceLine)}
          >
            <td className="mono">{ins.address}</td>
            <td className="mono bytes">{ins.bytes}</td>
            <td className="mono cycles">{ins.cycles ?? "?"}</td>
            <td className="mono mnemonic">
              {ins.mnemonic}
              {ins.comment ? <span className="comment"> ; {ins.comment}</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
