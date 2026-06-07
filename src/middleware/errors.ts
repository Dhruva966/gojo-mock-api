import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so rejected promises become 500 responses
 * instead of unhandled rejections that crash the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error-handling middleware — must be registered last.
 * Logs the error and returns a generic 500 so internals are never leaked.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[error]", {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
}
