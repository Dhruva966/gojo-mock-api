import express from "express";
import cors from "cors";
import { usersRouter } from "./routes/users.js";
import { postsRouter } from "./routes/posts.js";
import { authenticate } from "./middleware/auth.js";
import { requestTelemetry } from "./middleware/telemetry.js";
import { globalErrorHandler } from "./middleware/errors.js";
import { db } from "./db/client.js";
import { ZodError } from "zod";

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestTelemetry);

app.use("/users", usersRouter);
app.use("/posts", authenticate, postsRouter);

// Health check with DB connectivity probe
app.get("/health", async (_req, res) => {
  try {
    const dbStart = performance.now();
    await db.query("SELECT 1");
    const dbLatencyMs = Math.round(performance.now() - dbStart);
    res.json({ ok: true, uptime: process.uptime(), db: { connected: true, latencyMs: dbLatencyMs } });
  } catch {
    res.status(503).json({ ok: false, uptime: process.uptime(), db: { connected: false } });
  }
});

// Zod validation errors → 400; everything else → 500
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten().fieldErrors });
    return;
  }
  globalErrorHandler(err, req, res, next);
});

const PORT = Number(process.env.PORT) || 8080;
const server = app.listen(PORT, () => console.log(`gojo-mock-api running on :${PORT}`));

// --- Graceful shutdown ---
function shutdown(signal: string) {
  console.log(`[shutdown] ${signal} received — draining connections`);
  server.close(async () => {
    try { await db.end(); } catch { /* already closed */ }
    console.log("[shutdown] clean exit");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[shutdown] forced exit after 10s");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
