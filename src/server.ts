import express from "express";
import { usersRouter } from "./routes/users.js";
import { postsRouter } from "./routes/posts.js";
import { authenticate } from "./middleware/auth.js";
import { telemetry } from "./middleware/telemetry.js";

const app = express();
app.use(express.json());
app.use(telemetry);

app.use("/users", usersRouter);
app.use("/posts", authenticate, postsRouter);

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.listen(8080, () => console.log("gojo-mock-api running on :8080"));
