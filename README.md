# Companheiro

Aplicativo mobile-first para ajudar a pessoa a nao desistir antes de comecar uma atividade fisica.

## Rodar agora

1. Abra um terminal nesta pasta.
2. `npm install`.
3. Execute `npm start`.
4. Acesse `http://localhost:8000`.

Sem `DATABASE_URL` definida, o backend usa um armazenamento em memoria persistido em `.data/companheiro.json` (modo dev). Com `DATABASE_URL` definida (ver "Banco de dados" abaixo), ele usa Postgres/Supabase de verdade — o resto do app se comporta identico nos dois modos.

## Arquitetura

O backend (`server.js`) e um entrypoint fino. A logica mora em `src/`:

- `src/lib/` — infraestrutura comum (env, logging estruturado, helpers HTTP, erros, crypto).
- `src/store/` — camada de armazenamento. `memoryStore.js` (dev, sem dependencias externas) e `postgresStore.js` (producao) implementam a mesma interface; `src/store/index.js` escolhe qual usar com base em `DATABASE_URL`.
- `src/services/` — regra de negocio (auth, perfil, sessao/maquina de estados, objecoes, conversas, IA, notificacoes, analytics, social, voz), sem nada de HTTP misturado.
- `src/routes/` — traduz HTTP para chamadas de servico.

O frontend (`index.html/app.js`) nao mudou: todas as rotas mantem o mesmo path, verbo e formato de resposta.

## Banco de dados (Postgres/Supabase)

1. Crie um projeto no [Supabase](https://supabase.com) (ou use um Postgres proprio) e copie a connection string.
2. Coloque em `DATABASE_URL` no `.env`.
3. Rode `npm run migrate` — aplica `schema.sql` (idempotente, seguro rodar de novo).
4. `npm start`. O log de inicializacao mostra `"store":"postgres"` quando a conexao funciona.

**Importante:** a implementacao Postgres (`src/store/postgresStore.js`) foi escrita e revisada com cuidado, mas nao pode ser testada contra um banco real no ambiente onde foi desenvolvida (sem Docker/Postgres disponivel). Rode a bateria de smoke test (registro, login, sessao, transicao de estado, chat, notificacoes, admin) antes de considerar producao-ready.

Sobre Row Level Security: como o backend fala com o Postgres via `DATABASE_URL` (conexao direta, com toda a autorizacao ja aplicada em `src/services/`), politicas de RLS nao se aplicam a essa conexao — so fariam sentido se o frontend passasse a falar direto com a API do Supabase (hoje ele so fala com este backend). Ver o comentario no topo de `schema.sql`.

## Docker

`Dockerfile` e `docker-compose.yml` estao prontos (app + Postgres local), mas tambem nao puderam ser testados neste ambiente por falta de Docker. Revise antes do primeiro uso real: `docker compose up --build`.

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

`schema.sql` organiza as tabelas do MVP (ver nota sobre RLS acima). Para producao: conecte `DATABASE_URL` a um Postgres/Supabase real (`npm run migrate`), configure as chaves VAPID e `OPENAI_API_KEY`, defina `ADMIN_TOKEN` proprio, e sirva atras de HTTPS (Web Push exige contexto seguro fora de `localhost`).
