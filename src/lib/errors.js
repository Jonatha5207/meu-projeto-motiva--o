export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message || code);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFound(code) { return new AppError(404, code); }
export function badRequest(code) { return new AppError(400, code); }
export function unauthorized(code = 'unauthorized') { return new AppError(401, code); }
export function payloadTooLarge() { return new AppError(413, 'payload_too_large'); }

export function errorToResponse(error, logger) {
  // 413 fecha a conexão de propósito: a leitura do corpo foi abortada no meio,
  // então sobra payload não consumido no socket. Reaproveitar essa conexão
  // keep-alive faria o próximo request ler lixo (ver histórico de ECONNRESET
  // nesta mesma correção). Por isso este caso é checado antes de instanceof AppError.
  if (error.statusCode === 413) return { status: 413, body: { error: 'payload_too_large' }, headers: { Connection: 'close' } };
  if (error instanceof AppError) return { status: error.statusCode, body: { error: error.code } };
  logger?.error('unhandled_route_error', error);
  return { status: 500, body: { error: 'internal_error', message: error.message } };
}
