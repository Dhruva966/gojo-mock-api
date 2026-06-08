import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../server.js";

vi.mock("../db/client.js", () => ({
  db: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

describe("Health check", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.uptime).toBe("number");
  });
});
