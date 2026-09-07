import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../src/lib/env.js';

const root = fileURLToPath(new URL('..', import.meta.url));
loadEnvFile(join(root, '.env'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Defina no .env (a connection string do Supabase/Postgres) antes de rodar a migração.');
  process.exit(1);
}

const schemaPath = join(root, 'schema.sql');
if (!existsSync(schemaPath)) {
  console.error('schema.sql não encontrado em ' + schemaPath);
  process.exit(1);
}

const { Pool } = pg;
const ssl = process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

const sql = readFileSync(schemaPath, 'utf8');

try {
  console.log('Aplicando schema.sql em ' + new URL(process.env.DATABASE_URL).hostname + '...');
  await pool.query(sql);
  console.log('Migração concluída. Todas as tabelas usam "create table if not exists", então rodar de novo é seguro.');
} catch (error) {
  console.error('Falha ao aplicar schema.sql:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
