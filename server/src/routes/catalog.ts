import { Router } from "express";
import { listCpus, listTargets, listToolchains } from "../toolchains/registry.js";

/** Read-only, compiler-agnostic catalog data used to populate the client's CPU/platform/target pickers. */
export const router = Router();

router.get("/cpus", (_req, res) => {
  res.json(listCpus());
});

router.get("/targets", (_req, res) => {
  res.json(listTargets());
});

router.get("/toolchains", (_req, res) => {
  res.json(listToolchains());
});
