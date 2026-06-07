import request from "supertest";
import express from "express";
import { authenticate } from "../middleware/auth";
import jwt from "jsonwebtoken";

// Mock pg before importing routes
jest.mock("pg", () => {
  const mockQuery = jest.fn();
  const MockPool = jest.fn(() => ({
    query: mockQuery,
    on: jest.fn(),
  }));
  return { Pool: MockPool };
});

// Get the mocked pool instance
import { db } from "../db/client";
const mockQuery = db.query as jest.Mock;

import { postsRouter } from "../routes/posts";
import { usersRouter } from "../routes/users";

const JWT_SECRET = "dev-secret-change-in-prod";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/users", usersRouter);
  app.use("/posts", authenticate, postsRouter);
  return app;
}

describe("Bug Fix Verification", () => {
  let app: express.Application;

  beforeEach(() => {
    app = makeApp();
    mockQuery.mockReset();
  });

  describe("Fix 1: Auth middleware returns 401 without crashing", () => {
    it("should return 401 when Authorization header is missing", async () => {
      const res = await request(app).get("/posts");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authorization header missing");
    });

    it("should return 401 for an invalid token", async () => {
      const res = await request(app)
        .get("/posts")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Token expired or invalid");
    });

    it("should pass through with a valid token", async () => {
      const token = jwt.sign({ userId: "u1", email: "a@b.com" }, JWT_SECRET, { expiresIn: "1h" });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "p1", title: "Hello" }] });

      const res = await request(app)
        .get("/posts")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe("Fix 2: GET /posts returns results (LIMIT 50, not LIMIT 0)", () => {
    it("should return posts array from the database", async () => {
      const token = jwt.sign({ userId: "u1", email: "a@b.com" }, JWT_SECRET, { expiresIn: "1h" });
      const fakePosts = [{ id: "p1", title: "Post 1" }, { id: "p2", title: "Post 2" }];
      mockQuery.mockResolvedValueOnce({ rows: fakePosts });

      const res = await request(app)
        .get("/posts")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(fakePosts);
      // Verify the query uses LIMIT 50
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM posts ORDER BY created_at DESC LIMIT 50"
      );
    });

    it("should filter by userId with LIMIT 50", async () => {
      const token = jwt.sign({ userId: "u1", email: "a@b.com" }, JWT_SECRET, { expiresIn: "1h" });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "p1" }] });

      const res = await request(app)
        .get("/posts?userId=u1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
        ["u1"]
      );
    });
  });

  describe("Fix 3: PUT /posts/:id uses correct param index ($3)", () => {
    it("should update a post and return it", async () => {
      const token = jwt.sign({ userId: "u1", email: "a@b.com" }, JWT_SECRET, { expiresIn: "1h" });
      const updatedPost = { id: "p1", title: "Updated", body: "New body" };
      mockQuery.mockResolvedValueOnce({ rows: [updatedPost] });

      const res = await request(app)
        .put("/posts/p1")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Updated", body: "New body" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(updatedPost);
      // Verify $3 is used (not $4)
      expect(mockQuery).toHaveBeenCalledWith(
        "UPDATE posts SET title = COALESCE($1, title), body = COALESCE($2, body), updated_at = NOW() WHERE id = $3 RETURNING *",
        ["Updated", "New body", "p1"]
      );
    });

    it("should return 404 when post not found", async () => {
      const token = jwt.sign({ userId: "u1", email: "a@b.com" }, JWT_SECRET, { expiresIn: "1h" });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put("/posts/nonexistent")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "X" });

      expect(res.status).toBe(404);
    });
  });

  describe("Fix 4: GET /users/billing returns mock billing data", () => {
    it("should return users with billing fields", async () => {
      const fakeUsers = [
        { id: "u1", name: "Alice", email: "alice@test.com" },
        { id: "u2", name: "Bob", email: "bob@test.com" },
      ];
      mockQuery.mockResolvedValueOnce({ rows: fakeUsers });

      const res = await request(app).get("/users/billing");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { id: "u1", name: "Alice", email: "alice@test.com", billing_tier: "pro", plan_amount: 29.99 },
        { id: "u2", name: "Bob", email: "bob@test.com", billing_tier: "pro", plan_amount: 29.99 },
      ]);
    });

    it("should query only existing columns (id, name, email)", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await request(app).get("/users/billing");

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT id, name, email FROM users ORDER BY created_at DESC"
      );
    });
  });

  describe("Fix 5: Route ordering — /billing before /:id", () => {
    it("should not treat 'billing' as a user ID", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "u1", name: "Test", email: "t@t.com" }] });

      const res = await request(app).get("/users/billing");

      // Should hit billing route, not /:id route
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT id, name, email FROM users ORDER BY created_at DESC"
      );
      expect(res.status).toBe(200);
    });
  });
});
