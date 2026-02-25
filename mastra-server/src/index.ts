/**
 * Mastra Multi-Agent Server
 * Exposes POST /api/orchestrate for the Lovable edge function proxy.
 */
import express from "express";
import cors from "cors";
import { orchestrate } from "./agents/orchestrator.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Auth middleware
app.use("/api", (req, res, next) => {
  const secret = process.env.MASTRA_API_SECRET;
  if (!secret) return next(); // no secret configured = open (dev mode)
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.post("/api/orchestrate", async (req, res) => {
  try {
    const { prompt, caseIr, mode } = req.body;
    if (!prompt || !caseIr) {
      return res.status(400).json({ error: "prompt and caseIr are required" });
    }
    const result = await orchestrate(prompt, caseIr, mode);
    res.json(result);
  } catch (err) {
    console.error("Orchestration error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = parseInt(process.env.PORT || "3000");
app.listen(PORT, () => console.log(`Mastra server running on port ${PORT}`));
