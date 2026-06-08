import { Router } from "express";
import { db } from "../db/client.js";
import { asyncHandler } from "../middleware/errors.js";
import { createPostSchema, updatePostSchema, uuidParamSchema } from "../validation/schemas.js";

const router = Router();

// GET /posts — list with optional ?userId= filter
router.get("/", asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const result = userId
    ? await db.query("SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId])
    : await db.query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 50");
  res.json(result.rows);
}));

// POST /posts — create post
router.post("/", asyncHandler(async (req, res) => {
  const { title, body, userId } = createPostSchema.parse(req.body);
  const result = await db.query(
    "INSERT INTO posts (title, body, user_id) VALUES ($1, $2, $3) RETURNING *",
    [title, body, userId ?? null]
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /posts/:id — update post
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = uuidParamSchema.parse(req.params);
  const data = updatePostSchema.parse(req.body);
  const result = await db.query(
    "UPDATE posts SET title = COALESCE($1, title), body = COALESCE($2, body), updated_at = NOW() WHERE id = $3 RETURNING *",
    [data.title ?? null, data.body ?? null, id]
  );
  if (!result.rows[0]) { res.status(404).json({ error: "Post not found" }); return; }
  res.json(result.rows[0]);
}));

export { router as postsRouter };
