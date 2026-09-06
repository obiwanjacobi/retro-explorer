import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { router as catalogRouter } from "./routes/catalog.js";
import { router as cc65Router } from "./routes/cc65.js";
import { router as z88dkRouter } from "./routes/z88dk.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.use("/api", catalogRouter);
app.use("/api/z88dk", z88dkRouter);
app.use("/api/cc65", cc65Router);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Serves the built client (client/dist, copied alongside server/dist in the deployed image) so the
// whole app is a single container - dev mode instead uses Vite's own dev server for the client.
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));

app.listen(config.port, () => {
  console.log(`z88dk-web server listening on http://localhost:${config.port}`);
});
