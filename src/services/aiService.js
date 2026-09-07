export const OPENAI_TIMEOUT_MS = 20000;

function fallback(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('dor') || text.includes('mal')) return 'Se você está com dor ou não está bem, não quero que se force. Cuide de você primeiro.';
  if (text.includes('cansad')) return 'Entendi. É cansaço físico ou falta de vontade de começar?';
  if (text.includes('tempo')) return 'Hoje parece falta de tempo, não falta de disciplina. Quer fazer menos tempo ou remarcar?';
  if (text.includes('sem vontade') || text.includes('pregui')) return 'Vamos deixar pequeno: roupa e tênis. Depois você decide o próximo passo.';
  return 'Estou aqui com você. O que está te segurando agora?';
}

export function createAiService({ logger }) {
  return {
    async respond(input) {
      if (!process.env.OPENAI_API_KEY) return { response_text: fallback(input.message), source: 'fallback' };
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.7,
            messages: [
              { role: 'system', content: 'Você é um amigo humano, acolhedor e direto. Não gere culpa. Faça uma pergunta por vez. Se houver dor, não incentive exercício. Responda em português brasileiro, brevemente.' },
              { role: 'user', content: JSON.stringify(input) },
            ],
          }),
          signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        });
        if (!response.ok) return { response_text: fallback(input.message), source: 'fallback' };
        const result = await response.json();
        return { response_text: result.choices?.[0]?.message?.content || fallback(input.message), source: 'ai' };
      } catch (error) {
        logger.warn('ai_response_failed', { message: error.message });
        return { response_text: fallback(input.message), source: 'fallback' };
      }
    },
  };
}
