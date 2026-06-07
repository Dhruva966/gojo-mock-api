import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../server.js";

vi.mock("../db/client.js", () => ({
  db: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

describe("Authentication middleware", () => {
  it("returns 401 with message when Authorization header is missing", async () => {
    const res = await request(app).get("/posts");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authorization header missing");
  });

  it("returns 401 when token is invalid", async () => {
    const res = await request(app)
      .get("/posts")
      .set("Authorization", "Bearer bad-token");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token expired or invalid");
  });

  it("allows access with a valid JWT", async () => {
    const { issueToken } = await import("../middleware/auth.js");
    const token = issueToken("user-1", "test@example.com");
    const res = await request(app)
      .get("/posts")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
