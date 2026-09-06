# Companheiro

Aplicativo mobile-first para ajudar a pessoa a nao desistir antes de comecar uma atividade fisica.

## Rodar agora

1. Abra um terminal nesta pasta.
2. Execute `npm start`.
3. Acesse `http://localhost:8000`.

O backend usa um armazenamento local de desenvolvimento em `.data/companheiro.json`. Assim, contas, sessoes, conversas, feedbacks e eventos continuam salvos quando o servidor reinicia.

## Voz e IA

Copie `.env.example` para `.env` e preencha `OPENAI_API_KEY` no backend para ativar respostas de IA, fala motivacional e conversa por voz. A chave nunca deve ser colocada no frontend.

Sem a chave, o app continua funcionando com fallback local e `speechSynthesis` do navegador.

Para voz humana gravada, o usuario pode enviar um arquivo de audio ou gravar a propria voz no Perfil. O app usa esse audio antes de tentar a fala sintetizada.

O painel DEV tambem possui a atualizacao de nome de um consentimento existente. Informe um ID como `cons_1234` e o token administrativo. O audio e a chave da OpenAI permanecem no backend.

## Notificacoes push (de verdade)

As notificacoes T-60/45/30/20 e pos-treino agora sao enviadas pelo backend via Web Push, chegando mesmo com o app fechado ou a tela travada (antes, dependiam de a aba do navegador estar aberta). Alem dos lembretes de treino, o backend tambem envia:

- **motivacao diaria** (uma vez por dia, a partir das 8h no horario do servidor);
- **celebracao de sequencia** ao completar 5/10/25/50/100 treinos;
- **reengajamento gentil** apos 3 dias sem nenhuma atividade de sessao, sem cobranca.

Para ativar em desenvolvimento:

1. Gere um par de chaves VAPID uma unica vez: `npx web-push generate-vapid-keys`.
2. Copie `.env.example` para `.env` e preencha `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (um `mailto:` valido).
3. `npm start` — o `.env` agora e carregado automaticamente pelo proprio `server.js`.
4. No app, ative as notificacoes no Perfil. O navegador vai pedir permissao e registrar a assinatura via `POST /api/devices`.

Sem as chaves VAPID configuradas, o app continua funcionando normalmente: o reforco local em primeiro piano (timers no navegador + voz) continua ativo, so o envio real fica desligado.

## Funcionalidades MVP

- cadastro e login;
- onboarding com perfil e rotina;
- primeira sessao criada automaticamente;
- sessoes e maquina de estados;
- conversa contextual com fallback;
- identificacao de objecoes (sincronizada com o backend);
- confirmacao, saida, conclusao, cancelamento e remarcacao;
- notificacoes push reais (treino + motivacao diaria + sequencia + reengajamento), sem spam;
- historico e feedback;
- analytics e taxa de resgate (calculada de verdade a partir das sessoes);
- perfil, preferencias, tema e modalidade esportiva;
- painel administrativo basico;
- schema relacional em `schema.sql` para Supabase/Postgres.

## Painel administrativo

Abra `http://localhost:8000/#admin` no navegador. O token local padrao e `dev-admin-token`. Em ambiente real, defina `ADMIN_TOKEN` no `.env`.

## Producao

O arquivo `schema.sql` ja organiza as tabelas e politicas RLS do MVP. Para producao, conecte o backend ao Supabase/Postgres, troque o armazenamento local, configure push notifications e use HTTPS.
