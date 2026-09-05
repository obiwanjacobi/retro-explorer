import type { Diagnostic } from "../types";

interface Props {
  diagnostics: Diagnostic[];
}

export function DiagnosticsPanel({ diagnostics }: Props) {
  if (diagnostics.length === 0) return null;

  return (
    <div className="diagnostics">
      {diagnostics.map((d, i) => (
        <div key={i} className={`diagnostic ${d.severity}`}>
          <span className="severity">{d.severity}</span>
          {d.file ? <span className="location">{d.file}{d.line ? `:${d.line}` : ""}</span> : null}
          <span className="message">{d.message}</span>
        </div>
      ))}
    </div>
  );
}
