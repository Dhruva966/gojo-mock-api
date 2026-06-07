import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-prod";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Bug: calling split() directly without null check — throws TypeError when
  // Authorization header is absent: "Cannot read properties of undefined (reading 'split')"
  const token = req.headers["authorization"].split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid" });
  }
}

export function issueToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
}
