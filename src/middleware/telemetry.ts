import { Request, Response, NextFunction } from "express";

const SLOW_REQUEST_MS = 500;

export function telemetry(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const method = req.method;
  const path = req.originalUrl;

  res.on("finish", () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = durationNs / 1e6;

    const entry = {
      method,
      path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    };

    if (durationMs >= SLOW_REQUEST_MS) {
      console.warn("[telemetry] SLOW", JSON.stringify(entry));
    } else {
      console.log("[telemetry]", JSON.stringify(entry));
    }
  });

  next();
}
