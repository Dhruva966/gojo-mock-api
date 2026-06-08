import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockQuery = vi.fn();
vi.mock("../db/client.js", () => ({
  db: { query: mockQuery },
}));

const { app } = await import("../server.js");

describe("Users routes", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("GET /users returns user list", async () => {
    const fakeUsers = [{ id: "1", name: "Satoru", email: "gojo@jjk.io" }];
    mockQuery.mockResolvedValueOnce({ rows: fakeUsers });

    const res = await request(app).get("/users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeUsers);
  });

  it("GET /users/:id returns 404 when user not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/users/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("GET /users/:id returns user when found", async () => {
    const user = { id: "1", name: "Satoru", email: "gojo@jjk.io" };
    mockQuery.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app).get("/users/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it("POST /users validates required fields", async () => {
    const res = await request(app).post("/users").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("name and email required");
  });

  it("POST /users creates a user", async () => {
    const user = { id: "1", name: "Satoru", email: "gojo@jjk.io" };
    mockQuery.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app).post("/users").send({ name: "Satoru", email: "gojo@jjk.io" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(user);
  });

  it("DELETE /users/:id returns 204", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete("/users/1");
    expect(res.status).toBe(204);
  });

  it("GET /users/billing falls through to :id route and returns 404", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get("/users/billing");
    expect(res.status).toBe(404);
  });
});
