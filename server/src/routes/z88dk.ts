import { Router } from "express";
import { z } from "zod";
import { runCompile } from "../toolchains/runCompile.js";
import { CompileRequestError } from "../toolchains/types.js";
import { z88dkToolchain } from "../toolchains/z88dk/index.js";

// Typed, whitelisted request body for the z88dk platform specifically - compilerId/clibId are checked
// against this toolchain's own discovered options below, never passed through to zcc unvalidated.
const compileBodySchema = z.object({
  source: z.string().max(200_000),
  targetId: z.string().max(64),
  compilerId: z.string().max(64).optional(),
  clibId: z.string().max(64).optional(),
  optLevel: z.enum(["0", "1", "2", "3"]).optional(),
});

export const router = Router();

router.post("/compile", async (req, res) => {
  const parsed = compileBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", details: parsed.error.issues });
    return;
  }
  const { source, targetId, compilerId, clibId, optLevel } = parsed.data;

  const target = z88dkToolchain.targets.find((t) => t.id === targetId);
  if (!target) {
    res.status(400).json({ error: `Unknown z88dk target "${targetId}".` });
    return;
  }
  if (compilerId && !z88dkToolchain.compilers?.some((c) => c.id === compilerId)) {
    res.status(400).json({ error: `Unknown compiler "${compilerId}" for this target.` });
    return;
  }
  if (clibId && !target.clibs?.some((c) => c.id === clibId)) {
    res.status(400).json({ error: `Unknown C library "${clibId}" for this target.` });
    return;
  }
  // Reject compiler/CPU combos the compiler itself can't support (e.g. zsdcc has no 8080/8085 port) -
  // driven by each compiler's own `unsupportedCpus` metadata, not hardcoded per-id here.
  const clibCpuId = target.clibs?.find((c) => c.id === clibId)?.cpuId;
  const compiler = z88dkToolchain.compilers?.find((c) => c.id === compilerId);
  if (clibCpuId && compiler?.unsupportedCpus?.includes(clibCpuId)) {
    res.status(400).json({ error: `${compiler.label} does not support the ${clibCpuId} CPU.` });
    return;
  }

  try {
    const result = await runCompile(source, targetId, z88dkToolchain, { compilerId, clibId, optLevel });
    res.json(result);
  } catch (err) {
    if (err instanceof CompileRequestError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error while compiling." });
  }
});
