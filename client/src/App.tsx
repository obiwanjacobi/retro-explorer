import { useEffect, useRef, useState } from "react";
import { fetchCpus, fetchTargets, fetchToolchains } from "./api";
import { AsmView } from "./components/AsmView";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { SourceEditor } from "./components/SourceEditor";
import { StatusBar } from "./components/StatusBar";
import { platforms } from "./platforms/registry";
import type { PlatformOptions } from "./platforms/types";
import type { AsmInstruction, CompileTarget, Cpu, Diagnostic, LineRange, Toolchain } from "./types";
import "./App.css";

const DEFAULT_SOURCE = `int add(int a, int b) {
    return a + b;
}

void main() {
    add(1, 2);
}
`;

function App() {
  const [cpus, setCpus] = useState<Cpu[]>([]);
  const [cpuId, setCpuId] = useState("z80");
  const [toolchains, setToolchains] = useState<Toolchain[]>([]);
  const [toolchainId, setToolchainId] = useState("z88dk");
  const [targets, setTargets] = useState<CompileTarget[]>([]);
  const [targetId, setTargetId] = useState("z80");
  const [platformOptions, setPlatformOptions] = useState<PlatformOptions>({});
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [instructions, setInstructions] = useState<AsmInstruction[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [citeRange, setCiteRange] = useState<LineRange | null>(null);
  const [asmRange, setAsmRange] = useState<LineRange | null>(null);
  const [compileTimeMs, setCompileTimeMs] = useState<number | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCpus()
      .then((c) => {
        setCpus(c);
        if (c.length > 0 && !c.some((x) => x.id === cpuId)) setCpuId(c[0].id);
      })
      .catch(() => setCompileError("Could not reach the compile server."));
    fetchToolchains()
      .then((tc) => {
        setToolchains(tc);
        if (tc.length > 0 && !tc.some((x) => x.id === toolchainId)) setToolchainId(tc[0].id);
      })
      .catch(() => setCompileError("Could not reach the compile server."));
    fetchTargets()
      .then((t) => {
        setTargets(t);
        if (t.length > 0 && !t.some((x) => x.id === targetId)) setTargetId(t[0].id);
      })
      .catch(() => setCompileError("Could not reach the compile server."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toolchainsForCpu = toolchains.filter((tc) => tc.cpus.includes(cpuId));
  const targetsForToolchain = targets.filter((t) => t.toolchainId === toolchainId && t.cpus.includes(cpuId));
  const currentToolchain = toolchains.find((tc) => tc.id === toolchainId);
  const currentTarget = targets.find((t) => t.id === targetId);
  const provider = platforms[toolchainId];

  useEffect(() => {
    if (toolchainsForCpu.length > 0 && !toolchainsForCpu.some((tc) => tc.id === toolchainId)) {
      setToolchainId(toolchainsForCpu[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuId, toolchains]);

  useEffect(() => {
    if (targetsForToolchain.length > 0 && !targetsForToolchain.some((t) => t.id === targetId)) {
      setTargetId(targetsForToolchain[0].id);
    }
    setPlatformOptions({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolchainId, cpuId, targets]);

  const runCompile = async (src: string, target: string, options: PlatformOptions) => {
    if (!provider) return;
    setIsCompiling(true);
    setCompileError(null);
    try {
      const result = await provider.compile(src, target, options);
      setInstructions(result.instructions);
      setDiagnostics(result.diagnostics);
      setCompileTimeMs(result.compileTimeMs);
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : "Compile failed.");
      setInstructions([]);
      setDiagnostics([]);
      setCompileTimeMs(null);
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCompile(source, targetId, platformOptions);
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, targetId, platformOptions]);

  const handleCiteSelectionChange = (range: LineRange | null) => {
    setCiteRange(range);
    setAsmRange(null);
  };

  const handleAsmSelectRange = (range: LineRange | null) => {
    setAsmRange(range);
    setCiteRange(null);
  };

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Retro Explorer</h1>
        <select value={cpuId} onChange={(e) => setCpuId(e.target.value)}>
          {cpus.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={toolchainId} onChange={(e) => setToolchainId(e.target.value)}>
          {toolchainsForCpu.map((tc) => (
            <option key={tc.id} value={tc.id}>
              {tc.label} ({tc.version})
            </option>
          ))}
        </select>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {targetsForToolchain.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {provider?.ToolbarOptions && currentTarget && currentToolchain ? (
          <provider.ToolbarOptions
            target={currentTarget}
            toolchain={currentToolchain}
            cpuId={cpuId}
            options={platformOptions}
            onOptionsChange={setPlatformOptions}
          />
        ) : null}
        <button onClick={() => runCompile(source, targetId, platformOptions)} disabled={isCompiling}>
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
            onSelectionChange={handleCiteSelectionChange}
          />
        </section>
        <section className="pane asm-pane">
          <AsmView
            instructions={instructions}
            activeLine={activeLine}
            citeRange={citeRange}
            asmRange={asmRange}
            onHoverLine={setActiveLine}
            onSelectRange={handleAsmSelectRange}
          />
        </section>
      </main>
      <DiagnosticsPanel diagnostics={diagnostics} />
      <StatusBar instructions={instructions} citeRange={citeRange} asmRange={asmRange} compileTimeMs={compileTimeMs} />
    </div>
  );
}

export default App

