import type { CompileResponse, CompileTarget } from "./types";

export async function fetchTargets(): Promise<CompileTarget[]> {
  const res = await fetch("/api/targets");
  if (!res.ok) throw new Error("Failed to load compile targets.");
  return res.json();
}

export async function compile(source: string, targetId: string): Promise<CompileResponse> {
  const res = await fetch("/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, targetId }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "Compile request failed.");
  }
  return body as CompileResponse;
}
