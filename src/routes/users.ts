import { Router } from "express";
import { db } from "../db/client.js";

const router = Router();

// GET /users — list all users
router.get("/", async (_req, res) => {
  const result = await db.query("SELECT id, name, email, created_at FROM users ORDER BY created_at DESC");
  res.json(result.rows);
});

// GET /users/billing — returns mock billing data for all users
router.get("/billing", async (_req, res) => {
  const result = await db.query("SELECT id, name, email FROM users ORDER BY created_at DESC");
  const billing = result.rows.map((u: { id: string; name: string; email: string }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    billing_tier: "pro",
    plan_amount: 29.99,
  }));
  res.json(billing);
});

// GET /users/:id — get single user
router.get("/:id", async (req, res) => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
  res.json(result.rows[0]);
});

// POST /users — create user
router.post("/", async (req, res) => {
  const { name, email } = req.body as { name: string; email: string };
  if (!name || !email) return res.status(400).json({ error: "name and email required" });
  const result = await db.query(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
    [name, email]
  );
  res.status(201).json(result.rows[0]);
});

// DELETE /users/:id
router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export { router as usersRouter };
