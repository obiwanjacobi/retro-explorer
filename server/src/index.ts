import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { router } from "./routes/compile.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.use("/api", router);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(config.port, () => {
  console.log(`z88dk-web server listening on http://localhost:${config.port}`);
});
