import { useEffect, useRef, useState } from "react";
import { compile, fetchTargets } from "./api";
import { AsmView } from "./components/AsmView";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { SourceEditor } from "./components/SourceEditor";
import type { AsmInstruction, CompileTarget, Diagnostic } from "./types";
import "./App.css";

const DEFAULT_SOURCE = `int add(int a, int b) {
    return a + b;
}

void main() {
    add(1, 2);
}
`;

function App() {
  const [targets, setTargets] = useState<CompileTarget[]>([]);
  const [targetId, setTargetId] = useState("zx");
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [instructions, setInstructions] = useState<AsmInstruction[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchTargets()
      .then((t) => {
        setTargets(t);
        if (t.length > 0 && !t.some((x) => x.id === targetId)) setTargetId(t[0].id);
      })
      .catch(() => setCompileError("Could not reach the compile server."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCompile = async (src: string, target: string) => {
    setIsCompiling(true);
    setCompileError(null);
    try {
      const result = await compile(src, target);
      setInstructions(result.instructions);
      setDiagnostics(result.diagnostics);
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : "Compile failed.");
      setInstructions([]);
      setDiagnostics([]);
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCompile(source, targetId);
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, targetId]);

  return (
    <div className="app">
      <header className="toolbar">
        <h1>z88dk Explorer</h1>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button onClick={() => runCompile(source, targetId)} disabled={isCompiling}>
          {isCompiling ? "Compiling…" : "Compile"}
        </button>
        {compileError ? <span className="server-error">{compileError}</span> : null}
      </header>
      <main className="panes">
        <section className="pane editor-pane">
          <SourceEditor
            value={source}
            onChange={setSource}
            diagnostics={diagnostics}
            activeLine={activeLine}
            onCursorLineChange={setActiveLine}
          />
        </section>
        <section className="pane asm-pane">
          <AsmView instructions={instructions} activeLine={activeLine} onSelectLine={setActiveLine} />
        </section>
      </main>
      <DiagnosticsPanel diagnostics={diagnostics} />
    </div>
  );
}

export default App

