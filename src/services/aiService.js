export const OPENAI_TIMEOUT_MS = 20000;

function lastUserText(input) {
  if (input.message) return input.message;
  const history = Array.isArray(input.messages) ? input.messages : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.from === 'user') return history[i].text;
  }
  return '';
}

function fallback(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('dor') || text.includes('mal')) return 'Se você está com dor ou não está bem, não quero que se force. Cuide de você primeiro.';
  if (text.includes('cansad')) return 'Entendi. É cansaço físico ou falta de vontade de começar?';
  if (text.includes('tempo')) return 'Hoje parece falta de tempo, não falta de disciplina. Quer fazer menos tempo ou remarcar?';
  if (text.includes('sem vontade') || text.includes('pregui')) return 'Vamos deixar pequeno: roupa e tênis. Depois você decide o próximo passo.';
  return 'Estou aqui com você. O que está te segurando agora?';
}

// Monta uma conversa de verdade (system + historico com role correto) em vez de
// jogar o objeto inteiro como uma unica mensagem de usuario -- isso deixava a
// resposta generica, sem realmente "puxar" o tom de amigo da mesma modalidade.
function buildMessages(input) {
  const profile = input.profile || {};
  const activity = profile.activity || 'atividade física';
  const name = profile.name ? `, ${profile.name}` : '';
  const defaultPersona = `Você é o Companheiro: um amigo de verdade que também pratica ${activity} e está acompanhando essa pessoa${name} hoje. Fale como um amigo da mesma modalidade falaria -- natural, caloroso, direto. Mencione elementos concretos e específicos de ${activity} sempre que fizer sentido na conversa (ex.: se for CrossFit, fale de WOD, AMRAP, treino funcional, box; se for corrida, fale de ritmo, pace, treino intervalado, longão; se for musculação/academia, fale de séries, carga, grupo muscular; se for natação, fale de nado, piscina, respiração; se for futebol/vôlei/basquete, fale de time, jogo, posição; adapte para a modalidade real informada). Não fale de forma genérica como se fosse qualquer esporte -- mostre que entende dessa modalidade específica. Nunca gere culpa, vergonha ou comparação com outras pessoas. Não seja terapeuta nem coach agressivo. Faça uma pergunta por vez. Se houver menção a dor ou mal-estar, não incentive exercício -- priorize o cuidado. Responda sempre no mesmo idioma que a pessoa usar (se ela escrever em inglês, responda em inglês; em espanhol, responda em espanhol; assim por diante) -- por padrão, se não houver pista clara do idioma, use português brasileiro. Seja breve (1-3 frases).`;
  const systemPrompt = input.persona || defaultPersona;
  const extraContext = [
    input.analysis?.objection ? `Dificuldade identificada agora: ${input.analysis.objection}.` : null,
    profile.difficulty ? `Dificuldade que essa pessoa costuma ter: ${profile.difficulty}.` : null,
    input.live_context?.people_training_now ? `${input.live_context.people_training_now} pessoas da rede estão treinando agora.` : null,
    input.live_context?.workout_elapsed_seconds ? `Ela já está treinando há ${Math.round(input.live_context.workout_elapsed_seconds / 60)} minutos.` : null,
  ].filter(Boolean).join(' ');
  const history = (Array.isArray(input.messages) ? input.messages : []).slice(-10).map(message => ({
    role: message.from === 'user' ? 'user' : 'assistant',
    content: String(message.text || ''),
  }));
  const messages = [{ role: 'system', content: extraContext ? `${systemPrompt}\n\nContexto: ${extraContext}` : systemPrompt }, ...history];
  if (!history.length || history[history.length - 1].role !== 'user') {
    const latest = lastUserText(input);
    if (latest) messages.push({ role: 'user', content: latest });
  }
  return messages;
}

export function createAiService({ logger }) {
  return {
    async respond(input) {
      if (!process.env.OPENAI_API_KEY) return { response_text: fallback(lastUserText(input)), source: 'fallback' };
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.8,
            messages: buildMessages(input),
          }),
          signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        });
        if (!response.ok) {
          logger.warn('ai_response_not_ok', { status: response.status, body: (await response.text()).slice(0, 300) });
          return { response_text: fallback(lastUserText(input)), source: 'fallback' };
        }
        const result = await response.json();
        return { response_text: result.choices?.[0]?.message?.content || fallback(lastUserText(input)), source: 'ai' };
      } catch (error) {
        logger.warn('ai_response_failed', { message: error.message });
        return { response_text: fallback(lastUserText(input)), source: 'fallback' };
      }
    },
  };
}
