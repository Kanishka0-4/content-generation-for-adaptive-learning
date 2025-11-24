import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Simple helper for direct queries
export const db = {
  query: (text, params) => pool.query(text, params),
};
