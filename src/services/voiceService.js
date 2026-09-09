import { cleanText } from '../lib/http.js';
import { AppError, badRequest } from '../lib/errors.js';
import { OPENAI_TIMEOUT_MS } from './aiService.js';

export const TTS_VOICES = ['coral', 'alloy', 'onyx', 'nova', 'shimmer', 'echo', 'fable', 'ash', 'sage', 'verse', 'ballad'];

export function createVoiceService() {
  return {
    async motivationAudio(input) {
      const text = cleanText(input.text, 4096);
      if (!text) throw badRequest('invalid_audio_text');
      if (!process.env.OPENAI_API_KEY) throw new AppError(501, 'configure_openai_api_key');
      const requestedVoice = TTS_VOICES.includes(input.voice) ? input.voice : (process.env.OPENAI_TTS_VOICE || 'coral');
      try {
        const providerResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: requestedVoice, input: text, instructions: 'Fale no mesmo idioma do texto, com tom humano, acolhedor, calmo e breve.', response_format: 'mp3' }),
          signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        });
        if (!providerResponse.ok) throw new AppError(502, 'tts_provider_unavailable');
        return Buffer.from(await providerResponse.arrayBuffer());
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(504, 'tts_provider_timeout');
      }
    },

    async listVoiceConsents(limit = 20) {
      if (!process.env.OPENAI_API_KEY) throw new AppError(501, 'configure_openai_api_key');
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
      try {
        const providerResponse = await fetch(`https://api.openai.com/v1/audio/voice_consents?limit=${safeLimit}`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) });
        return { status: providerResponse.status, body: await providerResponse.json() };
      } catch {
        throw new AppError(504, 'voice_consents_timeout');
      }
    },

    async updateVoiceConsent(consentId, input) {
      const id = cleanText(consentId, 120);
      const name = cleanText(input.name, 120);
      if (!/^cons_[A-Za-z0-9_-]+$/.test(id) || !name) throw badRequest('invalid_voice_consent');
      if (!process.env.OPENAI_API_KEY) throw new AppError(501, 'configure_openai_api_key');
      try {
        const providerResponse = await fetch(`https://api.openai.com/v1/audio/voice_consents/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({ name }),
          signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        });
        return { status: providerResponse.status, body: await providerResponse.json() };
      } catch {
        throw new AppError(504, 'voice_consents_timeout');
      }
    },

    async realtimeCall(sdp) {
      if (!process.env.OPENAI_API_KEY) throw new AppError(501, 'configure_openai_api_key');
      const form = new FormData();
      form.append('sdp', sdp);
      form.append('session', JSON.stringify({ type: 'realtime', model: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime', output_modalities: ['audio'], instructions: 'Fale em português brasileiro. Seja humano, breve, acolhedor e não gere culpa.' }));
      try {
        const providerResponse = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form, signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) });
        const answer = await providerResponse.text();
        return { status: providerResponse.status, answer, contentType: providerResponse.headers.get('content-type') || 'text/plain' };
      } catch {
        throw new AppError(504, 'realtime_timeout');
      }
    },
  };
}
