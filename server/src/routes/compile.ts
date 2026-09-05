import { Router } from "express";
import { z } from "zod";
import { compile, CompileRequestError } from "../compile/compileService.js";
import { COMPILE_TARGETS } from "../compile/targets.js";

const compileBodySchema = z.object({
  source: z.string().max(200_000),
  targetId: z.string().max(64),
});

export const router = Router();

router.get("/targets", (_req, res) => {
  res.json(COMPILE_TARGETS.map(({ id, label }) => ({ id, label })));
});

router.post("/compile", async (req, res) => {
  const parsed = compileBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", details: parsed.error.issues });
    return;
  }

  try {
    const result = await compile(parsed.data.source, parsed.data.targetId);
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
