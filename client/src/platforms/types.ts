import type { ComponentType } from "react";
import type { CompileResponse, CompileTarget, Toolchain } from "../types";

/** Extra, platform-specific compile choices beyond source/target (e.g. z88dk's compiler/clib pickers). */
export type PlatformOptions = Record<string, string>;

export interface PlatformToolbarProps {
  target: CompileTarget;
  toolchain: Toolchain;
  options: PlatformOptions;
  onOptionsChange: (options: PlatformOptions) => void;
}

/**
 * A pluggable per-platform client "provider": renders that platform's own
 * toolbar controls (if any) and knows how to call that platform's own typed
 * compile endpoint. Register new platforms in `registry.ts`.
 */
export interface PlatformProvider {
  id: string;
  /** Extra toolbar controls for this platform, or null if it has none. */
  ToolbarOptions: ComponentType<PlatformToolbarProps> | null;
  compile(source: string, targetId: string, options: PlatformOptions): Promise<CompileResponse>;
}
