import { createMemoryStore } from './memoryStore.js';
import { createPostgresStore } from './postgresStore.js';

// Ponto único de decisão: com DATABASE_URL definida, usa Postgres/Supabase de
// verdade; sem ela, cai no modo em memória (o mesmo comportamento do MVP até aqui,
// persistido em .data/companheiro.json apenas para conveniência de desenvolvimento).
export async function createStore({ dataDir, logger }) {
  if (process.env.DATABASE_URL) {
    logger.info('store_selected', { kind: 'postgres' });
    const ssl = process.env.DATABASE_SSL !== 'false';
    const store = createPostgresStore({ connectionString: process.env.DATABASE_URL, ssl, logger });
    await store.ping();
    return store;
  }
  logger.info('store_selected', { kind: 'memory', note: 'Defina DATABASE_URL para usar Postgres/Supabase.' });
  const store = createMemoryStore({ dataDir });
  await store.load();
  return store;
}
