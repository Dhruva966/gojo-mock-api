import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/gojo_mock",
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

db.on("error", (err) => {
  console.error("Unexpected idle-client error in pg Pool", err);
});
