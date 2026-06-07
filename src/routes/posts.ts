import { Router } from "express";
import { db } from "../db/client.js";

const router = Router();

// GET /posts — bug: LIMIT 0 returns no rows
router.get("/", async (req, res) => {
  const { userId } = req.query;
  const result = userId
    ? await db.query("SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC", [userId])
    : await db.query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 0");
  res.json(result.rows); // always [] for the unfiltered case
});

// POST /posts — create post
router.post("/", async (req, res) => {
  const { title, body, userId } = req.body as { title: string; body: string; userId: string };
  if (!title || !body) return res.status(400).json({ error: "title and body required" });
  const result = await db.query(
    "INSERT INTO posts (title, body, user_id) VALUES ($1, $2, $3) RETURNING *",
    [title, body, userId ?? null]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /posts/:id — bug: uses wrong param index ($4 instead of $3), always 404
router.put("/:id", async (req, res) => {
  const { title, body } = req.body as { title?: string; body?: string };
  const result = await db.query(
    "UPDATE posts SET title = COALESCE($1, title), body = COALESCE($2, body), updated_at = NOW() WHERE id = $4 RETURNING *",
    [title ?? null, body ?? null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Post not found" });
  res.json(result.rows[0]);
});

export { router as postsRouter };
