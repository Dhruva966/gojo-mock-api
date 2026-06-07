import express from "express";
import { usersRouter } from "./routes/users.js";
import { postsRouter } from "./routes/posts.js";
import { authenticate } from "./middleware/auth.js";

const app = express();
app.use(express.json());

app.use("/users", usersRouter);
app.use("/posts", authenticate, postsRouter);

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

export { app };
