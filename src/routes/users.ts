import { Router } from "express";
import { db } from "../db/client.js";
import { asyncHandler } from "../middleware/errors.js";
import { createUserSchema, uuidParamSchema } from "../validation/schemas.js";

const router = Router();

// GET /users — list all users
router.get("/", asyncHandler(async (_req, res) => {
  const result = await db.query("SELECT id, name, email, created_at FROM users ORDER BY created_at DESC");
  res.json(result.rows);
}));

// GET /users/:id — get single user
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  if (!result.rows[0]) { res.status(404).json({ error: "User not found" }); return; }
  res.json(result.rows[0]);
}));

// POST /users — create user
router.post("/", asyncHandler(async (req, res) => {
  const { name, email } = createUserSchema.parse(req.body);
  const result = await db.query(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
    [name, email]
  );
  res.status(201).json(result.rows[0]);
}));

// DELETE /users/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = uuidParamSchema.parse(req.params);
  await db.query("DELETE FROM users WHERE id = $1", [id]);
  res.status(204).end();
}));

export { router as usersRouter };
