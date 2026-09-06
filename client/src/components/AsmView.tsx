import { useEffect, useRef } from "react";
import type { AsmInstruction, LineRange } from "../types";

interface Props {
  instructions: AsmInstruction[];
  activeLine: number | null;
  citeRange: LineRange | null;
  asmRange: LineRange | null;
  onHoverLine: (line: number | null) => void;
  onSelectRange: (range: LineRange | null) => void;
}

export function AsmView({ instructions, activeLine, citeRange, asmRange, onHoverLine, onSelectRange }: Props) {
  const draggingRef = useRef(false);
  const anchorRef = useRef<number | null>(null);

  useEffect(() => {
    const stopDragging = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mouseup", stopDragging);
    return () => window.removeEventListener("mouseup", stopDragging);
  }, []);

  if (instructions.length === 0) {
    return <div className="asm-empty">No assembly to show yet. Compile some code.</div>;
  }

  const startSelection = (index: number) => {
    draggingRef.current = true;
    anchorRef.current = index;
    onSelectRange({ start: index, end: index });
  };

  const extendSelection = (index: number) => {
    if (!draggingRef.current || anchorRef.current === null) return;
    const start = Math.min(anchorRef.current, index);
    const end = Math.max(anchorRef.current, index);
    onSelectRange({ start, end });
  };

  const isRowSelected = (index: number, line: number | null) => {
    if (asmRange !== null) return index >= asmRange.start && index <= asmRange.end;
    if (line === null) return false;
    if (line === activeLine) return true;
    return citeRange !== null && line >= citeRange.start && line <= citeRange.end;
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
            className={isRowSelected(i, ins.sourceLine) ? "asm-row active" : "asm-row"}
            onMouseEnter={() => {
              onHoverLine(ins.sourceLine);
              extendSelection(i);
            }}
            onMouseDown={() => startSelection(i)}
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
