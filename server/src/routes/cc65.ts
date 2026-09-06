import { Router } from "express";
import { z } from "zod";
import { cc65Toolchain } from "../toolchains/cc65/index.js";
import { runCompile } from "../toolchains/runCompile.js";
import { CompileRequestError } from "../toolchains/types.js";

// Typed, whitelisted request body for the cc65 platform specifically.
const compileBodySchema = z.object({
  source: z.string().max(200_000),
  targetId: z.string().max(64),
  optLevel: z.enum(["O", "Oi", "Or", "Os"]).optional(),
});

export const router = Router();

router.post("/compile", async (req, res) => {
  const parsed = compileBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body.", details: parsed.error.issues });
    return;
  }
  const { source, targetId, optLevel } = parsed.data;

  const target = cc65Toolchain.targets.find((t) => t.id === targetId);
  if (!target) {
    res.status(400).json({ error: `Unknown cc65 target "${targetId}".` });
    return;
  }

  try {
    const result = await runCompile(source, targetId, cc65Toolchain, { optLevel });
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
