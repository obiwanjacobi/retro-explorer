import { useEffect } from "react";
import { compileZ88dk } from "../../api";
import type { PlatformOptions, PlatformProvider, PlatformToolbarProps } from "../types";

function Z88dkToolbarOptions({ target, toolchain, cpuId, options, onOptionsChange }: PlatformToolbarProps) {
  const compilers = toolchain.compilers ?? [];
  // Clibs that pin a different CPU than the one currently selected aren't valid choices here.
  const clibs = (target.clibs ?? []).filter((c) => !c.cpuId || c.cpuId === cpuId);

  const resolvedCompilerId = options.compilerId && compilers.some((c) => c.id === options.compilerId) ? options.compilerId : compilers[0]?.id;
  const resolvedClibId =
    clibs.length === 0
      ? undefined
      : options.clibId && clibs.some((c) => c.id === options.clibId)
        ? options.clibId
        : (clibs.find((c) => c.id === "default")?.id ?? clibs[0].id);

  // Keep the lifted options bag in sync with resolved defaults whenever the target/toolchain changes.
  useEffect(() => {
    const next: PlatformOptions = {};
    if (resolvedCompilerId) next.compilerId = resolvedCompilerId;
    if (resolvedClibId) next.clibId = resolvedClibId;
    if (next.compilerId !== options.compilerId || next.clibId !== options.clibId) {
      onOptionsChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, toolchain.id, resolvedCompilerId, resolvedClibId]);

  return (
    <>
      {compilers.length > 0 ? (
        <select
          value={resolvedCompilerId ?? ""}
          onChange={(e) => onOptionsChange({ ...options, compilerId: e.target.value })}
        >
          {compilers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      ) : null}
      {clibs.length > 1 ? (
        <select value={resolvedClibId ?? ""} onChange={(e) => onOptionsChange({ ...options, clibId: e.target.value })}>
          {clibs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      ) : null}
    </>
  );
}

export const z88dkProvider: PlatformProvider = {
  id: "z88dk",
  ToolbarOptions: Z88dkToolbarOptions,
  compile: (source, targetId, options) => compileZ88dk(source, targetId, options.compilerId, options.clibId),
};
