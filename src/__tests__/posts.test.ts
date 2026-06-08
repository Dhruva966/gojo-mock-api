import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockQuery = vi.fn();
vi.mock("../db/client.js", () => ({
  db: { query: mockQuery },
}));

// Import after mock setup
const { app } = await import("../server.js");
const { issueToken } = await import("../middleware/auth.js");

const token = issueToken("user-1", "test@example.com");

describe("Posts routes", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("GET /posts returns rows (LIMIT 50, not LIMIT 0)", async () => {
    const fakeRows = [{ id: "1", title: "Hello", body: "World" }];
    mockQuery.mockResolvedValueOnce({ rows: fakeRows });

    const res = await request(app)
      .get("/posts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeRows);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("LIMIT 50");
    expect(sql).not.toContain("LIMIT 0");
  });

  it("GET /posts?userId=x uses LIMIT 50 and passes userId param", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/posts?userId=abc")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("LIMIT 50");
    expect(mockQuery.mock.calls[0][1]).toEqual(["abc"]);
  });

  it("PUT /posts/:id uses correct param index $3", async () => {
    const updated = { id: "post-1", title: "New", body: "Body" };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });

    const res = await request(app)
      .put("/posts/post-1")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(updated);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("$3");
    expect(sql).not.toContain("$4");
  });

  it("PUT /posts/:id returns 404 when post not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put("/posts/nonexistent")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Post not found");
  });

  it("POST /posts validates required fields", async () => {
    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("title and body required");
  });

  it("POST /posts creates a post", async () => {
    const created = { id: "p1", title: "T", body: "B", user_id: "user-1" };
    mockQuery.mockResolvedValueOnce({ rows: [created] });

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "T", body: "B", userId: "user-1" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(created);
  });
});
