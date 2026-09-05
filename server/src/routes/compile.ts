import { Router } from "express";
import { z } from "zod";
import { listTargets, listToolchains } from "../toolchains/registry.js";
import { runCompile } from "../toolchains/runCompile.js";
import { CompileRequestError } from "../toolchains/types.js";

const compileBodySchema = z.object({
  source: z.string().max(200_000),
  targetId: z.string().max(64),
  compilerId: z.string().max(64).optional(),
});

export const router = Router();

router.get("/targets", (_req, res) => {
  res.json(listTargets());
});

router.get("/toolchains", (_req, res) => {
  res.json(listToolchains());
});

router.post("/compile", async (req, res) => {
  const parsed = compileBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", details: parsed.error.issues });
    return;
  }

  try {
    const result = await runCompile(parsed.data.source, parsed.data.targetId, parsed.data.compilerId);
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
