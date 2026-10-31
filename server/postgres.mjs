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

export function createDatabase(pool, memoryOptions={}) {
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
    async recall(sessionId, question, beforeId) {
      if(memoryOptions.CHAT_MEMORY_SEARCH==='false')return [];
      const query=String(question).normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2).slice(0,24).join(' OR ');
      if(!query)return [];
      try {
        // Bound retrieval; never search or return another visitor's session.
        const result=await pool.query(`SELECT id,role,content,created_at FROM chat_messages
          WHERE session_id=$1 AND id<$2 AND kind IN ('user','reply')
          AND search_vector @@ websearch_to_tsquery('simple',$3)
          ORDER BY ts_rank_cd(search_vector,websearch_to_tsquery('simple',$3)) DESC,id DESC LIMIT 6`,[sessionId,beforeId,query]);
        let left=12000;
        return result.rows.sort((a,b)=>a.id-b.id).flatMap(m=>{const content=m.content.slice(0,Math.min(3000,left));left-=content.length;return content?[{...m,content}]:[];});
      } catch {console.warn('Older chat retrieval unavailable; using recent context.');return [];}
    },
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

export function createPool(connectionString, options={}) {
  const tls={};
  if(options.DATABASE_SSL_CA?.trim()) {
    const url=new URL(connectionString);
    for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
    connectionString=url.toString();
    tls.ssl={ca:options.DATABASE_SSL_CA.replace(/\\n/g,'\n'),rejectUnauthorized:true};
  }
  return new pg.Pool({ connectionString,...tls, max: 8, connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000, statement_timeout: 15000 });
}

export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(817230941)');
    await client.query('CREATE TABLE IF NOT EXISTS app_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const [version,file] of [['001-render','001.sql'],['002-images','002.sql'],['003-transfers','003.sql'],['004-memory','004.sql']]) {
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
