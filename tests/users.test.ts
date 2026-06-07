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

describe("src/routes/users.ts — SyntaxError fix verification", () => {
  it("should import without throwing a SyntaxError", async () => {
    // If we reach this point, the module was imported successfully
    // (no SyntaxError from the regex flag being on a separate line)
    expect(usersRouter).toBeDefined();
  });

  it("should have UUID_RE regex that is case-insensitive (the /i flag works)", async () => {
    // Uppercase UUID should be accepted (proves /i flag is attached)
    const uppercaseUUID = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";
    mockQuery.mockResolvedValue({ rows: [{ id: uppercaseUUID, name: "Test" }] });

    const res = await request(app).get(`/users/${uppercaseUUID}`);
    expect(res.status).not.toBe(400);
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

  it("should return 500 on database error", async () => {
    mockQuery.mockRejectedValue(new Error("connection refused"));

    const res = await request(app).get("/users");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("GET /users/:id", () => {
  const validUUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("should return 400 for an invalid UUID", async () => {
    const res = await request(app).get("/users/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("id must be a valid UUID");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("should return 400 for a numeric id (non-UUID)", async () => {
    const res = await request(app).get("/users/123");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("id must be a valid UUID");
  });

  it("should return 404 when user is not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app).get(`/users/${validUUID}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("should return the user for a valid lowercase UUID", async () => {
    const user = { id: validUUID, name: "Alice", email: "alice@test.com" };
    mockQuery.mockResolvedValue({ rows: [user] });

    const res = await request(app).get(`/users/${validUUID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it("should accept uppercase UUIDs (case-insensitive regex)", async () => {
    const upperUUID = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
    const user = { id: upperUUID, name: "Bob", email: "bob@test.com" };
    mockQuery.mockResolvedValue({ rows: [user] });

    const res = await request(app).get(`/users/${upperUUID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it("should return 500 on database error", async () => {
    mockQuery.mockRejectedValue(new Error("timeout"));

    const res = await request(app).get(`/users/${validUUID}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("POST /users", () => {
  it("should return 400 when name is missing", async () => {
    const res = await request(app).post("/users").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("name and email required");
  });

  it("should return 400 when email is missing", async () => {
    const res = await request(app).post("/users").send({ name: "Alice" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("name and email required");
  });

  it("should create a user and return 201", async () => {
    const created = { id: "11111111-1111-1111-1111-111111111111", name: "Alice", email: "a@b.com" };
    mockQuery.mockResolvedValue({ rows: [created] });

    const res = await request(app).post("/users").send({ name: "Alice", email: "a@b.com" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
  });

  it("should return 500 on database error", async () => {
    mockQuery.mockRejectedValue(new Error("unique violation"));

    const res = await request(app).post("/users").send({ name: "Alice", email: "a@b.com" });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("DELETE /users/:id", () => {
  const validUUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("should return 400 for an invalid UUID", async () => {
    const res = await request(app).delete("/users/bad-id");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("id must be a valid UUID");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("should return 204 on successful delete", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const res = await request(app).delete(`/users/${validUUID}`);
    expect(res.status).toBe(204);
  });

  it("should return 500 on database error", async () => {
    mockQuery.mockRejectedValue(new Error("connection lost"));

    const res = await request(app).delete(`/users/${validUUID}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
