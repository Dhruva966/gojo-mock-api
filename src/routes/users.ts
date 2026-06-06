import { Router } from "express";
import { db } from "../db/client.js";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /users — list all users
router.get("/", async (_req, res) => {
  try {
    const result = await db.query("SELECT id, name, email, created_at FROM users ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("GET /users failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/:id — get single user
router.get("/:id", async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(400).json({ error: "id must be a valid UUID" });
      return;
    }
    const result = await db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /users/:id failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /users — create user
router.post("/", async (req, res) => {
  try {
    const { name, email } = req.body as { name: string; email: string };
    if (!name || !email) {
      res.status(400).json({ error: "name and email required" });
      return;
    }
    const result = await db.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /users failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /users/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      res.status(400).json({ error: "id must be a valid UUID" });
      return;
    }
    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error("DELETE /users/:id failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as usersRouter };
