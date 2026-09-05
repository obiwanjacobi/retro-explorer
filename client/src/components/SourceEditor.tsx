import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Diagnostic } from "../types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  diagnostics: Diagnostic[];
  activeLine: number | null;
  onCursorLineChange: (line: number | null) => void;
}

export function SourceEditor({ value, onChange, diagnostics, activeLine, onCursorLineChange }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<ReturnType<NonNullable<typeof editorRef.current>["createDecorationsCollection"]> | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorationsRef.current = editor.createDecorationsCollection([]);
    editor.onDidChangeCursorPosition((e) => {
      onCursorLineChange(e.position.lineNumber);
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !decorationsRef.current) return;
    if (activeLine === null) {
      decorationsRef.current.set([]);
      return;
    }
    decorationsRef.current.set([
      {
        range: new monaco.Range(activeLine, 1, activeLine, 1),
        options: {
          isWholeLine: true,
          className: "active-line-highlight",
        },
      },
    ]);
  }, [activeLine]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(
      model,
      "z88dk",
      diagnostics
        .filter((d) => d.line !== undefined)
        .map((d) => ({
          startLineNumber: d.line!,
          startColumn: 1,
          endLineNumber: d.line!,
          endColumn: model.getLineMaxColumn(Math.min(d.line!, model.getLineCount())),
          message: d.message,
          severity: d.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        }))
    );
  }, [diagnostics]);

  return (
    <Editor
      height="100%"
      defaultLanguage="c"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      theme="vs-dark"
      options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
    />
  );
}
