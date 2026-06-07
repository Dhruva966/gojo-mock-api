import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../db/client.js", () => ({
  db: { query: mockQuery },
}));

import { app } from "../app.js";

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /users", () => {
  it("returns a list of users", async () => {
    const users = [
      { id: "u1", name: "Gojo", email: "gojo@jujutsu.io", created_at: "2025-01-01T00:00:00Z" },
      { id: "u2", name: "Geto", email: "geto@jujutsu.io", created_at: "2025-01-02T00:00:00Z" },
    ];
    mockQuery.mockResolvedValueOnce({ rows: users });

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(users);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC"
    );
  });

  it("returns an empty array when no users exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /users/:id", () => {
  it("returns a single user when found", async () => {
    const user = { id: "u1", name: "Gojo", email: "gojo@jujutsu.io", created_at: "2025-01-01T00:00:00Z" };
    mockQuery.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app).get("/users/u1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
    expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM users WHERE id = $1", ["u1"]);
  });

  it("returns 404 when user is not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/users/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });
});

describe("POST /users", () => {
  it("creates a user and returns 201", async () => {
    const created = { id: "u3", name: "Nanami", email: "nanami@jujutsu.io", created_at: "2025-01-03T00:00:00Z" };
    mockQuery.mockResolvedValueOnce({ rows: [created] });

    const res = await request(app)
      .post("/users")
      .send({ name: "Nanami", email: "nanami@jujutsu.io" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(mockQuery).toHaveBeenCalledWith(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      ["Nanami", "nanami@jujutsu.io"]
    );
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/users")
      .send({ email: "no-name@test.io" });

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
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("DELETE /users/:id", () => {
  it("deletes a user and returns 204", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app).delete("/users/u1");

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(mockQuery).toHaveBeenCalledWith("DELETE FROM users WHERE id = $1", ["u1"]);
  });

  it("returns 204 even when user does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).delete("/users/nonexistent");

    expect(res.status).toBe(204);
  });
});

describe("GET /users/billing", () => {
  it("is shadowed by /:id — Express matches the :id param route first", async () => {
    // The /billing route is defined after /:id, so Express treats "billing" as
    // an :id value and queries for a user with id="billing" instead.
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/users/billing");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
    expect(mockQuery).toHaveBeenCalledWith("SELECT * FROM users WHERE id = $1", ["billing"]);
  });
});
