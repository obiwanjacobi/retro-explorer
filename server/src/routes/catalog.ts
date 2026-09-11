import { Router } from "express";
import { listTargets, listToolchains } from "../toolchains/registry.js";

/** Read-only, compiler-agnostic catalog data used to populate the client's platform/target pickers. */
export const router = Router();

router.get("/targets", (_req, res) => {
  res.json(listTargets());
});

router.get("/toolchains", (_req, res) => {
  res.json(listToolchains());
});
