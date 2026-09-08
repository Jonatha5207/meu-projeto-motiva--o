import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { createMemoryStore } from './memoryStore.js';
import { createPostgresStore } from './postgresStore.js';

const { Pool } = pg;

// Aplica schema.sql a cada start (create table/index "if not exists", insert
// "on conflict do nothing" -- idempotente, seguro rodar toda vez). Evita depender
// de alguem lembrar de rodar "npm run migrate" manualmente apos o primeiro deploy
// num Postgres novo (ex.: Render), e nunca sobrescreve dados existentes.
async function ensureSchema(root, connectionString, ssl, logger) {
  const schemaPath = join(root, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');
  const pool = new Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: false } : false });
  try {
    await pool.query(sql);
    logger.info('schema_applied');
  } finally {
    await pool.end();
  }
}

// Ponto único de decisão: com DATABASE_URL definida, usa Postgres/Supabase de
// verdade; sem ela, cai no modo em memória (o mesmo comportamento do MVP até aqui,
// persistido em .data/companheiro.json apenas para conveniência de desenvolvimento).
export async function createStore({ dataDir, root, logger }) {
  if (process.env.DATABASE_URL) {
    logger.info('store_selected', { kind: 'postgres' });
    const ssl = process.env.DATABASE_SSL !== 'false';
    await ensureSchema(root, process.env.DATABASE_URL, ssl, logger);
    const store = createPostgresStore({ connectionString: process.env.DATABASE_URL, ssl, logger });
    await store.ping();
    return store;
  }
  logger.info('store_selected', { kind: 'memory', note: 'Defina DATABASE_URL para usar Postgres/Supabase.' });
  const store = createMemoryStore({ dataDir });
  await store.load();
  return store;
}
