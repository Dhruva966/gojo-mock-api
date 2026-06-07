import { Request, Response, NextFunction } from "express";

const LATENCY_WARN_MS = Number(process.env.LATENCY_WARN_MS) || 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 15_000;

export function requestTelemetry(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();

  const timer = setTimeout(() => {
    if (!res.headersSent) {
      console.error("[telemetry] request_timeout", {
        method: req.method,
        path: req.originalUrl,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });
      res.status(503).json({ error: "Request timed out" });
    }
  }, REQUEST_TIMEOUT_MS);

  res.on("finish", () => {
    clearTimeout(timer);
    const durationMs = performance.now() - start;
    const logEntry = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    };
    if (durationMs > LATENCY_WARN_MS) {
      console.warn("[telemetry] high_latency", logEntry);
    } else {
      console.log("[telemetry] request", logEntry);
    }
  });

  next();
}
