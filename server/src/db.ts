import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const query = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const result = await pool.query(sql, params);
  return result.rows as T[];
};
