import { Router } from "express";
import { db } from "../db/client.js";
import { isUUID } from "../util/validate.js";

const router = Router();

// GET /posts — list with optional ?userId= filter
router.get("/", async (req, res) => {
  try {
    const rawUserId = req.query.userId;
    const userId = typeof rawUserId === "string" ? rawUserId : undefined;

    if (userId !== undefined && !isUUID(userId)) {
      res.status(400).json({ error: "userId must be a valid UUID" });
      return;
    }

    const result = userId
      ? await db.query("SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId])
      : await db.query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 50");
    res.json(result.rows);
  } catch (err) {
    console.error("[posts] GET / error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /posts — create post
router.post("/", async (req, res) => {
  try {
    const { title, body, userId } = req.body as { title: string; body: string; userId?: string };
    if (!title || !body) {
      res.status(400).json({ error: "title and body required" });
      return;
    }
    if (userId !== undefined && !isUUID(userId)) {
      res.status(400).json({ error: "userId must be a valid UUID" });
      return;
    }
    const result = await db.query(
      "INSERT INTO posts (title, body, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, body, userId ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[posts] POST / error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /posts/:id — update post
router.put("/:id", async (req, res) => {
  try {
    if (!isUUID(req.params.id)) {
      res.status(400).json({ error: "id must be a valid UUID" });
      return;
    }
    const { title, body } = req.body as { title?: string; body?: string };
    const result = await db.query(
      "UPDATE posts SET title = COALESCE($1, title), body = COALESCE($2, body), updated_at = NOW() WHERE id = $3 RETURNING *",
      [title ?? null, body ?? null, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("[posts] PUT /:id error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as postsRouter };
