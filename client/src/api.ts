import type { CompileResponse, CompileTarget, Cpu, Toolchain } from "./types";

export async function fetchCpus(): Promise<Cpu[]> {
  const res = await fetch("/api/cpus");
  if (!res.ok) throw new Error("Failed to load CPU list.");
  return res.json();
}

export async function fetchToolchains(): Promise<Toolchain[]> {
  const res = await fetch("/api/toolchains");
  if (!res.ok) throw new Error("Failed to load toolchains.");
  return res.json();
}

export async function fetchTargets(): Promise<CompileTarget[]> {
  const res = await fetch("/api/targets");
  if (!res.ok) throw new Error("Failed to load compile targets.");
  return res.json();
}

async function postCompile(endpoint: string, body: Record<string, unknown>): Promise<CompileResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await res.json();
  if (!res.ok) {
    throw new Error(responseBody.error ?? "Compile request failed.");
  }
  return responseBody as CompileResponse;
}

export function compileZ88dk(
  source: string,
  targetId: string,
  compilerId?: string,
  clibId?: string,
  optLevel?: string
): Promise<CompileResponse> {
  return postCompile("/api/z88dk/compile", { source, targetId, compilerId, clibId, optLevel });
}

export function compileCc65(source: string, targetId: string, optLevel?: string): Promise<CompileResponse> {
  return postCompile("/api/cc65/compile", { source, targetId, optLevel });
}
