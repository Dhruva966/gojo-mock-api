import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// Mock the db module before importing the router
vi.mock("../src/db/client.js", () => ({
  db: { query: vi.fn() },
}));

import { db } from "../src/db/client.js";
import { usersRouter } from "../src/routes/users.js";

const app = express();
app.use(express.json());
app.use("/users", usersRouter);

const mockQuery = db.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /users/billing — route ordering fix", () => {
  it("should match /billing before /:id so it is not treated as a user ID lookup", async () => {
    const billingUsers = [
      { id: "aaa", name: "Alice", billing_tier: "pro", plan_amount: 29.99 },
    ];
    mockQuery.mockResolvedValue({ rows: billingUsers });

    const res = await request(app).get("/users/billing");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(billingUsers);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT id, name, billing_tier, plan_amount FROM users WHERE billing_tier IS NOT NULL"
    );
  });

  it("should return an empty array when no users have a billing tier", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app).get("/users/billing");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should return multiple billing users", async () => {
    const billingUsers = [
      { id: "aaa", name: "Alice", billing_tier: "pro", plan_amount: 29.99 },
      { id: "bbb", name: "Bob", billing_tier: "enterprise", plan_amount: 99.99 },
    ];
    mockQuery.mockResolvedValue({ rows: billingUsers });

    const res = await request(app).get("/users/billing");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body).toEqual(billingUsers);
  });

  it("should not invoke the /:id handler for /billing path", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app).get("/users/billing");

    // The /:id handler would query with WHERE id = $1 and parameterized args.
    // The billing handler uses a fixed query with no params.
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT id, name, billing_tier, plan_amount FROM users WHERE billing_tier IS NOT NULL"
    );
  });
});

describe("GET /users", () => {
  it("should return all users", async () => {
    const fakeUsers = [
      { id: "11111111-1111-1111-1111-111111111111", name: "Alice", email: "alice@test.com" },
      { id: "22222222-2222-2222-2222-222222222222", name: "Bob", email: "bob@test.com" },
    ];
    mockQuery.mockResolvedValue({ rows: fakeUsers });

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeUsers);
  });
});

describe("GET /users/:id", () => {
  it("should return the user when found", async () => {
    const user = { id: "aaa", name: "Alice", email: "alice@test.com" };
    mockQuery.mockResolvedValue({ rows: [user] });

    const res = await request(app).get("/users/some-id");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it("should return 404 when user is not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app).get("/users/nonexistent-id");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });
});

describe("POST /users", () => {
  it("should return 400 when name is missing", async () => {
    const res = await request(app).post("/users").send({ email: "a@b.com" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "name and email required" });
  });

  it("should return 400 when email is missing", async () => {
    const res = await request(app).post("/users").send({ name: "Alice" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "name and email required" });
  });

  it("should return 400 when body is empty", async () => {
    const res = await request(app).post("/users").send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "name and email required" });
  });

  it("should create a user and return 201", async () => {
    const created = { id: "ccc", name: "Alice", email: "a@b.com" };
    mockQuery.mockResolvedValue({ rows: [created] });

    const res = await request(app).post("/users").send({ name: "Alice", email: "a@b.com" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
    expect(mockQuery).toHaveBeenCalledWith(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      ["Alice", "a@b.com"]
    );
  });
});

describe("DELETE /users/:id", () => {
  it("should return 204 on successful delete", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app).delete("/users/some-id");

    expect(res.status).toBe(204);
  });
});
