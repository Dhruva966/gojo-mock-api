import { Pool, QueryResult } from "pg";

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/gojo_mock",
  max: 20,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 10_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error", { message: err.message });
});

const originalQuery: typeof pool.query = pool.query.bind(pool);

const instrumentedQuery: typeof pool.query = function (
  this: Pool,
  ...args: unknown[]
): any {
  const start = performance.now();
  const promise = (originalQuery as Function).apply(this, args) as Promise<QueryResult>;
  return promise.then((res) => {
    const durationMs = performance.now() - start;
    if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
      const queryText =
        typeof args[0] === "string"
          ? args[0]
          : (args[0] as { text?: string })?.text ?? "";
      console.warn("[telemetry] slow_query", {
        durationMs: Math.round(durationMs),
        query: queryText.slice(0, 200),
      });
    }
    return res;
  });
} as any;

pool.query = instrumentedQuery;

export { pool as db };
