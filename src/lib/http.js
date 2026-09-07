import { payloadTooLarge } from './errors.js';

export function cleanText(value, max = 240) {
  return String(value ?? '').trim().slice(0, max);
}

export const MAX_BODY_BYTES = 1_000_000;

export function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-Realtime-Session',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

export async function readRawBody(request, maxBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw payloadTooLarge();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  let raw = '';
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw payloadTooLarge();
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}
