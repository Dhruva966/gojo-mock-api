import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock the db module before importing app
vi.mock("../db/client.js", () => ({
  db: { query: vi.fn() },
}));

import { app } from "../app.js";
import { db } from "../db/client.js";

const mockQuery = vi.mocked(db.query);

beforeEach(() => {
  mockQuery.mockReset();
});

// ── GET /users ──────────────────────────────────────────────────────────────

describe("GET /users", () => {
  it("returns all users ordered by created_at DESC", async () => {
    const users = [
      { id: "u1", name: "Gojo", email: "gojo@jjk.io", created_at: "2026-01-02" },
      { id: "u2", name: "Geto", email: "geto@jjk.io", created_at: "2026-01-01" },
    ];
    mockQuery.mockResolvedValueOnce({ rows: users } as any);

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(users);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC"
    );
  });

  it("returns an empty array when no users exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── GET /users/billing ──────────────────────────────────────────────────────

describe("GET /users/billing", () => {
  it("returns users that have a billing_tier", async () => {
    const billingUsers = [
      { id: "u1", name: "Gojo", billing_tier: "pro", plan_amount: 29.99 },
    ];
    mockQuery.mockResolvedValueOnce({ rows: billingUsers } as any);

    const res = await request(app).get("/users/billing");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(billingUsers);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT id, name, billing_tier, plan_amount FROM users WHERE billing_tier IS NOT NULL"
    );
  });

  it("is not swallowed by the /:id route (route ordering regression)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(app).get("/users/billing");

    // If the billing route is accidentally placed after /:id, the query
    // would contain "WHERE id = $1" with 'billing' as the param instead
    // of the billing-specific query.
    const call = mockQuery.mock.calls[0];
    expect(call[0]).toContain("billing_tier");
    expect(call[0]).not.toContain("WHERE id = $1");
    expect(res.status).toBe(200);
  });

  it("returns empty array when no users have billing_tier", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(app).get("/users/billing");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ── GET /users/:id ──────────────────────────────────────────────────────────

describe("GET /users/:id", () => {
  it("returns a user when found", async () => {
    const user = { id: "abc-123", name: "Gojo", email: "gojo@jjk.io" };
    mockQuery.mockResolvedValueOnce({ rows: [user] } as any);

    const res = await request(app).get("/users/abc-123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
    expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM users WHERE id = $1", ["abc-123"]);
  });

  it("returns 404 when user does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(app).get("/users/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });
});

// ── POST /users ─────────────────────────────────────────────────────────────

describe("POST /users", () => {
  it("creates a user and returns 201", async () => {
    const created = { id: "new-1", name: "Yuji", email: "yuji@jjk.io" };
    mockQuery.mockResolvedValueOnce({ rows: [created] } as any);

    const res = await request(app)
      .post("/users")
      .send({ name: "Yuji", email: "yuji@jjk.io" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(mockQuery).toHaveBeenCalledWith(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      ["Yuji", "yuji@jjk.io"]
    );
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "no-name@jjk.io" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "name and email required" });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/users")
      .send({ name: "NoEmail" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "name and email required" });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app)
      .post("/users")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "name and email required" });
  });
});

// ── DELETE /users/:id ───────────────────────────────────────────────────────

describe("DELETE /users/:id", () => {
  it("deletes a user and returns 204 with no body", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any);

    const res = await request(app).delete("/users/abc-123");

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect(mockQuery).toHaveBeenCalledWith("DELETE FROM users WHERE id = $1", ["abc-123"]);
  });
});
