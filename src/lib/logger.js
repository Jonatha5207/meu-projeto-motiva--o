function write(level, message, meta) {
  const entry = { timestamp: new Date().toISOString(), level, message };
  if (meta instanceof Error) { entry.error = meta.message; entry.stack = meta.stack; }
  else if (meta && typeof meta === 'object') Object.assign(entry, meta);
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
