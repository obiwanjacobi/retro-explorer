import { useEffect, useMemo, useRef, useState } from "react";
import { fetchTargets, fetchToolchains } from "./api";
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

const SOURCE_STORAGE_KEY = "retro-explorer:source";

function loadStoredSource(): string {
  try {
    return localStorage.getItem(SOURCE_STORAGE_KEY) ?? DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
}

function App() {
  const [cpuId, setCpuId] = useState("z80");
  const [toolchains, setToolchains] = useState<Toolchain[]>([]);
  const [toolchainId, setToolchainId] = useState("z88dk");
  const [targets, setTargets] = useState<CompileTarget[]>([]);
  const [targetId, setTargetId] = useState("z80");
  const [platformOptions, setPlatformOptions] = useState<PlatformOptions>({});
  const [source, setSource] = useState(loadStoredSource);
  const [instructions, setInstructions] = useState<AsmInstruction[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [citeRange, setCiteRange] = useState<LineRange | null>(null);
  const [asmRange, setAsmRange] = useState<LineRange | null>(null);
  const [compileTimeMs, setCompileTimeMs] = useState<number | null>(null);
  const [commandLine, setCommandLine] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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

  // Every toolchain publishes its own static CPU list; collect them all and de-dupe by id so a CPU
  // supported by more than one toolchain (e.g. z80) only shows up once in the picker.
  const cpus = useMemo(() => {
    const byId = new Map<string, Cpu>();
    for (const tc of toolchains) for (const c of tc.cpus) if (!byId.has(c.id)) byId.set(c.id, c);
    return Array.from(byId.values());
  }, [toolchains]);

  useEffect(() => {
    if (cpus.length > 0 && !cpus.some((c) => c.id === cpuId)) setCpuId(cpus[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpus]);

  const toolchainsForCpu = toolchains.filter((tc) => tc.cpus.some((c) => c.id === cpuId));
  const targetsForToolchain = targets.filter((t) => t.toolchainId === toolchainId && t.cpus.includes(cpuId));
  const currentToolchain = toolchains.find((tc) => tc.id === toolchainId);
  const currentTarget = targets.find((t) => t.id === targetId);
  const provider = platforms[toolchainId];
  // The toolchain can claim a CPU (e.g. z88dk lists the whole zcc CPU family) without any actual
  // target/clib backing it on this install (e.g. r3k) - `targetId` then stays stuck on the last
  // valid target instead of resetting, so guard against silently compiling/showing stale results.
  // `targets` starts empty until the initial fetch resolves, so don't flag "unsupported" before then.
  const hasTargetForCpu = targets.length === 0 || targetsForToolchain.length > 0;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolchainId, cpuId, targets]);

  // Only clear stale options when the toolchain itself changes (its option keys, e.g. z88dk's
  // clibId, are meaningless to a different provider) - NOT on every cpuId/target change, which
  // would race with ToolbarOptions' own effect that resolves a valid compilerId/clibId for the
  // new CPU/target and lift it up, clobbering it back to `{}` right after.
  useEffect(() => {
    setPlatformOptions({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolchainId]);

  const runCompile = async (src: string, target: string, options: PlatformOptions) => {
    if (!provider) return;
    setIsCompiling(true);
    setCompileError(null);
    try {
      const result = await provider.compile(src, target, options);
      setInstructions(result.instructions);
      setDiagnostics(result.diagnostics);
      setCompileTimeMs(result.compileTimeMs);
      setCommandLine(result.commandLine);
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : "Compile failed.");
      setInstructions([]);
      setDiagnostics([]);
      setCompileTimeMs(null);
      setCommandLine(null);
    } finally {
      setIsCompiling(false);
    }
  };

  useEffect(() => {
    if (!hasTargetForCpu) {
      // Nothing can compile for this CPU on this toolchain - clear stale results instead of leaving
      // the previous target's output on screen looking like it applies to the new CPU.
      setInstructions([]);
      setDiagnostics([]);
      setCompileTimeMs(null);
      setCommandLine(null);
      setCompileError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCompile(source, targetId, platformOptions);
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, targetId, platformOptions, hasTargetForCpu]);

  useEffect(() => {
    try {
      localStorage.setItem(SOURCE_STORAGE_KEY, source);
    } catch {
      // ignore storage errors (e.g. quota exceeded, private browsing)
    }
  }, [source]);

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
        {provider?.ToolbarOptions && currentTarget && currentToolchain && hasTargetForCpu ? (
          <provider.ToolbarOptions
            target={currentTarget}
            toolchain={currentToolchain}
            cpuId={cpuId}
            options={platformOptions}
            onOptionsChange={setPlatformOptions}
          />
        ) : null}
        <div className="compile-group">
          {!hasTargetForCpu ? (
            <span className="server-error">No {currentToolchain?.label ?? toolchainId} target supports this CPU yet.</span>
          ) : provider?.CompileControl && currentTarget && currentToolchain ? (
            <provider.CompileControl
              target={currentTarget}
              toolchain={currentToolchain}
              cpuId={cpuId}
              options={platformOptions}
              onOptionsChange={setPlatformOptions}
              onCompile={() => runCompile(source, targetId, platformOptions)}
              isCompiling={isCompiling}
            />
          ) : (
            <button onClick={() => runCompile(source, targetId, platformOptions)} disabled={isCompiling}>
              {isCompiling ? "Compiling…" : "Compile"}
            </button>
          )}
        </div>
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
      <StatusBar instructions={instructions} citeRange={citeRange} asmRange={asmRange} compileTimeMs={compileTimeMs} commandLine={commandLine} />
    </div>
  );
}

export default App

