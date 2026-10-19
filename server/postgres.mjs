import pg from 'pg';
import { readFile } from 'node:fs/promises';

// Preserve the existing, tested chat logic while translating its small SQL dialect.
export function postgresSql(sql) {
  const ignore = /^INSERT OR IGNORE INTO /i.test(sql);
  let n = 0;
  let translated = sql.replace(/^INSERT OR IGNORE INTO /i, 'INSERT INTO ')
    .replace(/'(?:''|[^'])*'|\?/g, token => token === '?' ? `$${++n}` : token)
    .replace(/\bLIKE\b/g, 'ILIKE');
  if (ignore) translated += ' ON CONFLICT DO NOTHING';
  return translated;
}

export function createDatabase(pool) {
  class Statement {
    constructor(sql, args = []) { this.sql = sql; this.args = args; }
    bind(...args) { return new Statement(this.sql, args); }
    async execute(client = pool) {
      const result = await client.query(postgresSql(this.sql), this.args);
      return { success: true, results: result.rows, meta: { changes: result.rowCount } };
    }
    async first() { return (await this.execute()).results[0] || null; }
    async all() { return this.execute(); }
    async run() { return this.execute(); }
  }
  return {
    prepare: sql => new Statement(sql),
    async batch(statements) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const results = [];
        for (const statement of statements) results.push(await statement.execute(client));
        await client.query('COMMIT');
        return results;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
  };
}

export function createPool(connectionString) {
  // Neon supplies TLS parameters in its connection string. Do not disable certificate checks.
  return new pg.Pool({ connectionString, max: 8, connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000, statement_timeout: 15000 });
}

export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(817230941)');
    await client.query('CREATE TABLE IF NOT EXISTS app_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const [version,file] of [['001-render','001.sql'],['002-images','002.sql'],['003-transfers','003.sql']]) {
      const applied = await client.query('SELECT version FROM app_migrations WHERE version=$1', [version]);
      if (!applied.rowCount) {
        await client.query(await readFile(new URL('../db/postgres/'+file, import.meta.url), 'utf8'));
        await client.query('INSERT INTO app_migrations(version) VALUES ($1)', [version]);
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
