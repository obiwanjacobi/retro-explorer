import type { AsmInstruction } from "../types";

interface Props {
  instructions: AsmInstruction[];
  activeLine: number | null;
  onSelectLine: (line: number | null) => void;
}

export function AsmView({ instructions, activeLine, onSelectLine }: Props) {
  if (instructions.length === 0) {
    return <div className="asm-empty">No assembly to show yet. Compile some code.</div>;
  }

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
            className={ins.sourceLine !== null && ins.sourceLine === activeLine ? "asm-row active" : "asm-row"}
            onMouseEnter={() => onSelectLine(ins.sourceLine)}
            onClick={() => onSelectLine(ins.sourceLine)}
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
