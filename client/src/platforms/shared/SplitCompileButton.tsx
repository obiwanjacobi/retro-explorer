import { useEffect, useRef, useState } from "react";
import type { PlatformToolbarProps } from "../types";

export interface OptLevelOption {
  id: string;
  label: string;
}

interface Props extends PlatformToolbarProps {
  onCompile: () => void;
  isCompiling: boolean;
  levels: OptLevelOption[];
  /** Formats the main button's label suffix from the selected level id, e.g. z88dk's "O2" from "2", cc65's "Oi" from "Oi". */
  formatMainLabel: (optLevel: string) => string;
}

/** A single "Compile" button with an attached caret that opens a menu to pick an optimization level, e.g. "Compile O2". */
export function SplitCompileButton({ options, onOptionsChange, onCompile, isCompiling, levels, formatMainLabel }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const selectLevel = (id: string) => {
    const { optLevel: _drop, ...rest } = options;
    onOptionsChange(id ? { ...rest, optLevel: id } : rest);
    setMenuOpen(false);
  };

  const label = isCompiling ? "Compiling…" : options.optLevel ? `Compile ${formatMainLabel(options.optLevel)}` : "Compile";

  return (
    <div className="split-button" ref={containerRef}>
      <button className="split-button-main" onClick={onCompile} disabled={isCompiling}>
        {label}
      </button>
      <button
        className="split-button-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={isCompiling}
        aria-label="Choose optimization level"
        aria-expanded={menuOpen}
      >
        ▾
      </button>
      {menuOpen ? (
        <ul className="split-button-menu" role="listbox">
          {levels.map((o) => (
            <li key={o.id} role="option" aria-selected={(options.optLevel ?? "") === o.id} onClick={() => selectLevel(o.id)}>
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
