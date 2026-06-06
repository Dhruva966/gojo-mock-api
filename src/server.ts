import express, { Request, Response, NextFunction } from "express";
import { usersRouter } from "./routes/users.js";
import { postsRouter } from "./routes/posts.js";
import { authenticate } from "./middleware/auth.js";

const app = express();
app.use(express.json());

app.use("/users", usersRouter);
app.use("/posts", authenticate, postsRouter);

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Global error handler — catches any unhandled errors that slip past route-level try/catch
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] unhandled error", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(8080, () => console.log("gojo-mock-api running on :8080"));
