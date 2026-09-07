import { existsSync, readFileSync } from 'node:fs';

export function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const REQUIRED_IN_PRODUCTION = ['ADMIN_TOKEN'];
const RECOMMENDED = ['OPENAI_API_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'DATABASE_URL'];

export function describeEnv(logger) {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingRequired = isProduction ? REQUIRED_IN_PRODUCTION.filter(key => !process.env[key]) : [];
  const missingRecommended = RECOMMENDED.filter(key => !process.env[key]);
  if (missingRequired.length) logger.error('env_missing_required', { keys: missingRequired });
  if (missingRecommended.length) logger.warn('env_missing_recommended', { keys: missingRecommended, note: 'Funcionalidades opcionais (IA, push, banco real) ficam desativadas sem essas chaves.' });
  return { isProduction, missingRequired, missingRecommended };
}
