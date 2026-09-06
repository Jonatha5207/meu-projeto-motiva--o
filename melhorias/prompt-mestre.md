# Prompt Mestre — Companheiro (documento de referência)

> Este arquivo guarda, na íntegra, a especificação de produto/UX/técnica usada como
> fonte da verdade para o MVP do Companheiro. Serve como referência para comparar
> contra o código existente (`server.js`, `index.html/app.js`, `schema.sql`) e para
> gerar os prompts fatiados em `emergent/` quando for necessário recriar ou estender
> partes do app em outra ferramenta (ex.: Emergent).
>
> Frase central do produto: **"Não deixe a pessoa desistir antes de começar."**

## 1. PAPEL

Você é um engenheiro de software sênior, arquiteto de sistemas, especialista em UX/UI mobile, produto digital, inteligência artificial conversacional e desenvolvimento de aplicativos.

Sua missão é desenvolver um MVP funcional, moderno, escalável e pronto para testes reais de um aplicativo chamado provisoriamente de **Companheiro**.

Não desenvolva apenas uma interface visual ou um protótipo estático.

Quero um aplicativo funcional, com frontend, backend, banco de dados, autenticação, notificações, persistência de dados, lógica de estados e integração com IA conversacional.

O projeto deve ser estruturado para permitir evolução futura.

## 2. CONCEITO DO PRODUTO

O aplicativo é um **companheiro digital de disciplina para atividade física**.

A proposta central é:

> "Não deixe a pessoa desistir antes de começar."

O aplicativo não deve funcionar simplesmente como um despertador dizendo:

> "Você tem treino às 19h."

Ele deve atuar justamente no intervalo entre:

> "Eu deveria ir."

e

> "Eu vou ou não vou?"

O aplicativo conhece: rotina; atividade; horário; objetivo; dificuldades; principais objeções; contexto básico do usuário.

Quando se aproxima o horário da atividade, inicia uma jornada de preparação.

Se o usuário demonstrar resistência, o aplicativo conversa com ele, identifica a objeção e tenta ajudá-lo a superar aquela barreira.

O produto deve transmitir a sensação de: "Tenho alguém me acompanhando."

Não deve parecer um coach agressivo, terapeuta ou robô.

A personalidade inicial será: **"O amigo que não deixa você desistir."**

Tom: humano; acolhedor; direto; inteligente; encorajador; levemente descontraído; sem exageros; sem frases genéricas de coach.

## 3. REGRA FUNDAMENTAL DO PRODUTO

O aplicativo NÃO deve gerar culpa.

Nunca utilizar frases como: "Você está decepcionando você mesma.", "Enquanto você está parada, alguém está treinando.", "Você nunca vai conseguir.", "Você é preguiçosa.", "Você precisa ter vergonha.", "Você está falhando."

A filosofia é: "Eu não vou te julgar. Mas também não vou deixar você desistir por qualquer motivo."

Se houver uma impossibilidade real, o aplicativo deve ajudar o usuário a encontrar uma alternativa.

Exemplo — Usuário: "Hoje não consigo. Estou trabalhando até agora." — Aplicativo: "Entendi. Hoje o problema não parece ser falta de disciplina, mas falta de tempo. Quer encontrar uma alternativa?" Opções: Treinar mais tarde / Treinar menos tempo / Treinar em casa / Remarcar para amanhã.

## 4. OBJETIVO DO MVP

O MVP deve validar a hipótese: uma comunicação personalizada e contextualizada, enviada antes do horário da atividade e capaz de conversar com o usuário sobre suas objeções, pode aumentar a probabilidade de ele realizar a atividade física.

O MVP precisa medir: cadastro; criação de rotina; recebimento de notificações; interação; identificação de objeções; recuperação de atividades; realização do treino; retenção.

Principal métrica — **Taxa de Resgate**: ex. 100 pessoas demonstraram intenção de desistir, 30 realizaram a atividade após interação = 30%.

## 5. PLATAFORMA

Aplicativo Mobile. Prioridade Android; arquitetura preparada para iOS depois. Se o ambiente permitir, usar arquitetura multiplataforma.

Componentes: frontend mobile; backend; banco de dados; autenticação; sistema de notificações; motor de sessões; sistema de conversação; integração com IA; analytics básico.

## 6. DESIGN / IDENTIDADE VISUAL

Interface premium, moderna e acolhedora. Não aparência de app médico. Não aparência de academia tradicional. Não excesso de elementos.

Sensação: "Um aplicativo pessoal que está do meu lado."

Direção visual: minimalista; elegante; moderno; amigável; bastante espaço em branco; cards arredondados; tipografia limpa; ícones simples; animações discretas; microinterações.

Paleta: fundo claro; branco; cinza muito claro; verde para sucesso; amarelo para atenção; vermelho apenas para estados realmente necessários; cor principal forte para CTA. Suporte estrutural para Dark Mode no futuro.

## 7. NAVEGAÇÃO PRINCIPAL

Bottom Navigation: Hoje; Rotina; Histórico; Perfil. "Hoje" é o coração do aplicativo.

## 8. ONBOARDING

Curto e agradável. Não fazer 50 perguntas. Apenas informações relevantes para personalização.

### Tela 1 — Boas-vindas
Título: "Vamos cuidar da sua disciplina?"
Texto: "Eu não estou aqui apenas para lembrar você de treinar. Quero entender sua rotina e ajudar justamente nos dias em que sua vontade de desistir aparecer."
CTA: COMEÇAR

### 9. Atividade
Pergunta: "Qual atividade você pratica?" Cards: Academia, Corrida, Caminhada, Natação, Ciclismo, Crossfit, Dança, Outra. Selecionar uma atividade principal; preparar banco para múltiplas atividades futuramente.

### 10. Frequência
Pergunta: "Quantas vezes por semana você pretende praticar?" Opções: 1 a 6, Todos os dias.

### 11. Dias
Pergunta: "Em quais dias você normalmente pratica?" Checkbox: Segunda a Domingo.

### 12. Horário
Pergunta: "Qual horário normalmente?" Time picker (ex. 19:00). Permitir horários diferentes por dia futuramente.

### 13. Deslocamento
Pergunta: "Quanto tempo você leva para chegar ao local?" Opções: <10min, 10–20, 20–30, 30–60, >1h.
Pergunta: "Como você chega?" A pé, Carro, Ônibus, Metrô/trem, Bicicleta, Outro. Não usar GPS no MVP.

### 14. Rotina pessoal
Perguntar: Você trabalha? / Você estuda? / Você tem filhos? (Sim/Não). Usar apenas para contextualização da IA.

### 15. Principais objeções (tela importante)
Pergunta: "Quando você pensa em não treinar, geralmente é por quê?" Múltipla escolha: Cansaço, Preguiça, Falta de tempo, Trabalho, Filhos, Frio, Chuva, Falta de vontade, Desânimo, Não vejo resultado, Falta de companhia, Vergonha, Dor, Outro. Salvar todas as respostas e registrar frequência posteriormente.

### 16. Motivação
Pergunta: "Por que você quer praticar atividade física?" Opções: Melhorar minha saúde, Emagrecer, Melhorar minha autoestima, Ter mais disposição, Cuidar de mim, Melhorar minha aparência, Acompanhar meus filhos, Envelhecer melhor, Melhorar meu desempenho, Realizar um sonho, Outro. Campo livre: "Quero escrever com minhas próprias palavras." Alimenta o contexto da IA.

### 17. Nível de disciplina
Pergunta: "Qual dessas frases mais parece com você?" A) Estou começando agora. B) Eu até consigo manter uma rotina. C) Sou bastante disciplinado. D) Eu começo, paro e começo de novo. Salvar como nível comportamental inicial.

### 18. Resumo do perfil
Mostrar resumo (atividade, horário, principal dificuldade, objetivo) + mensagem "Nos dias de treino, eu vou estar aqui para ajudar você a não desistir." CTA: "FECHADO. VAMOS NESSA."

## 19. TELA PRINCIPAL — HOJE

Dashboard simples: atividade, horário, contagem regressiva, status (ex. 🟡 Preparação), CTA "CONVERSAR COM MEU COMPANHEIRO". Se não houver treino: "Hoje você não tem atividade planejada." + mostrar próximo treino.

## 20. ROTINA

Visualizar/editar: atividade, dias, horários, local, duração, deslocamento. Permitir adicionar, editar, excluir, ativar/desativar treino.

## 21. HISTÓRICO

Calendário simples. Status por sessão: 🟢 Realizado, 🔴 Não realizado, 🟡 Remarcado. Ao clicar: atividade, horário, status, objeção, conversa, feedback, sensação.

## 22. PERFIL

Mostrar: nome, atividade principal, objetivo, frequência, nível de disciplina, principais objeções, motivação. Configurações: notificações, horário, privacidade, conta, sair.

## 23. MOTOR DE NOTIFICAÇÕES

Jornada automática antes da atividade, por sessão:
- **T-60**: "E aí! Hoje tem treino. Vamos começar a nos preparar?"
- **T-45**: "Já separou sua roupa?"
- **T-30**: "Como está sua vontade de ir hoje?" (escala 0–10)
- **T-20**: se não houver confirmação: "Percebi que você ainda não foi. Está tudo bem. O que está acontecendo?" — inicia a conversa.

## 24. MÁQUINA DE ESTADOS (não disparar mensagens cegamente)

Estados: PENDING, PREPARING, ENGAGED, OBJECTION, PREPARING_TO_GO, LEFT, COMPLETED, RESCHEDULED, CANCELLED, NOT_COMPLETED. A próxima mensagem depende do estado atual. Nunca enviar todas as notificações independentemente da interação.

## 25. CHAT

Interface tipo app de mensagens: avatar do Companheiro, mensagens, respostas rápidas, campo de texto, botão enviar, botão de áudio (preparado para o futuro). Respostas rápidas: Estou cansado, Estou sem vontade, Estou atrasado, Está frio, Está chovendo, Estou sem tempo, Aconteceu alguma coisa, Vou me preparar, Já saí.

## 26. MOTOR DE OBJEÇÕES

- **Cansaço**: "Você está cansado fisicamente ou está sem vontade de começar?"
- **Preguiça**: "Então não vamos pensar no treino inteiro. Só vamos resolver os próximos cinco minutos." Ação: levantar → colocar roupa → colocar tênis.
- **Frio**: "Eu sei. Vamos fazer um acordo: chega até a porta. Depois você decide."
- **Chuva**: não pressionar; oferecer treino em casa, outro horário, remarcação.
- **Trabalho**: "Hoje parece que o problema é falta de tempo. Quer encontrar uma alternativa?" (mais tarde, menos tempo, amanhã, casa).
- **Filhos**: reconhecer necessidade real; perguntar por outro horário; permitir remarcação sem culpa ("Seu treino não foi cancelado. Só mudou de horário.").
- **Desânimo**: usar a motivação cadastrada (ex. autoestima) para reconectar o usuário ao motivo original, sem cobrar resultado.
- **Falta de companhia**: "Você não quer ir sozinho ou realmente não está com vontade de treinar?"
- **Falta de tempo**: oferecer alternativas.
- **Dor**: se houver dor relevante/mal-estar/possível lesão, NÃO incentivar o exercício, não diagnosticar, não prescrever tratamento. Responder com segurança: "Se você está com dor ou não está se sentindo bem, não quero que você se force. Cuide de você primeiro."

## 27. IA CONVERSACIONAL

A IA recebe: nome, atividade, frequência, horário, nível, objetivo, motivação, principais objeções, trabalho, estudos, filhos, tempo de deslocamento, estado atual da sessão, mensagens recentes, histórico relevante.

Instruções: responder como amigo motivador; ser humano; não ser agressivo; não gerar culpa; não agir como terapeuta; investigar antes de aconselhar; se houver impossibilidade real, ajudar a achar alternativa; se houver dor/mal-estar importante, não incentivar exercício; resposta curta e natural; uma pergunta por vez quando apropriado.

## 28. MEMÓRIA

Estruturar o sistema para guardar histórico (ex. objeção recorrente aumenta frequência registrada). Não precisa estar 100% implementado no MVP, mas o banco deve estar preparado para inteligência comportamental futura (ex. "Você costuma desistir às terças por chegar cansado do trabalho").

## 29. PÓS-TREINO

Perguntar "E aí, você foi?" (Sim/Não).
- **Se sim**: "Sabia que você conseguiria." + "Como você se sentiu?" (😀🙂😐😫) + "Mais um treino feito. Não foi sobre vontade. Foi sobre aparecer."
- **Se não**: sem culpa — "Tudo bem. Amanhã é uma nova oportunidade." + "Quer me contar o que aconteceu?" (Cansaço, Falta de tempo, Preguiça, Problema pessoal, Não estava bem, Outro). Salvar resposta.

## 30. BANCO DE DADOS

Relacional (PostgreSQL/Supabase). Entidades: USERS, USER_PROFILE, ACTIVITIES, TRAINING_SCHEDULE, OBJECTIONS, USER_OBJECTIONS, TRAINING_SESSIONS (com status da máquina de estados), CONVERSATIONS, MESSAGES (sender_type APP/USER; message_type TEXT/QUICK_REPLY/SYSTEM), FEEDBACK, NOTIFICATIONS (tipos T_MINUS_60/45/30/20, POST_TRAINING), USER_DEVICE_TOKENS (para push), ANALYTICS_EVENTS (ONBOARDING_STARTED/COMPLETED, TRAINING_CREATED, NOTIFICATION_SENT/OPENED, CHAT_STARTED, OBJECTION_IDENTIFIED, TRAINING_CONFIRMED/RESCHEDULED/COMPLETED/NOT_COMPLETED, FEEDBACK_SUBMITTED, RESCUE_SUCCESS).

## 31. SEGURANÇA

Autenticação segura; proteção de rotas; autorização por usuário (cada um só acessa seus dados); armazenamento seguro de credenciais; validação de entrada; sem exposição de chaves de API no frontend. Se usar Supabase, usar Row Level Security.

## 32. PRIVACIDADE

Dados pessoais: permitir excluir conta, excluir dados, atualizar perfil, controlar notificações. Não coletar dados desnecessários. Sem localização no MVP.

## 33. PAINEL ADMINISTRATIVO

Simples, só para desenvolvimento/validação: usuários, sessões, atividades realizadas/não realizadas, objeções mais frequentes, taxa de resgate, retenção, conversas.

## 34. MÉTRICAS

Usuários (total, novos, ativos). Treinos (planejados, realizados, não realizados, remarcados). Conversas (iniciadas, respondidas, objeções identificadas). Taxa de resgate = RESGATES / OPORTUNIDADES DE DESISTÊNCIA × 100.

## 35. REGRAS DE NEGÓCIO

1. Nunca iniciar jornada para treino cancelado. 2. Se confirmar que vai, reduzir mensagens desnecessárias. 3. Se confirmar saída, encerrar notificações de preparação. 4. Se remarcar, atualizar sessão. 5. Se disser que não está bem, não pressionar. 6. Se houver dor importante, não incentivar treino. 7. Não gerar culpa. 8. Não enviar mensagens repetitivas. 9. IA deve considerar contexto do usuário. 10. Conversa deve parecer humana, não questionário automático.

## 36. EXPERIÊNCIA DE CHAT

Respostas curtas e diretas ("Entendi. Mas me responde uma coisa: você está cansado fisicamente ou sem vontade de começar?"), nunca longas/genéricas de coach.

## 37. MICROINTERAÇÕES

Check ao concluir preparação; progresso da sessão; transição suave; feedback ao completar treino; animação discreta de comemoração. Não exagerar.

## 38. HOME INTELIGENTE

Muda conforme o estado: sem treino, treino próximo, preparação, resistência, usuário saiu, treino concluído — cada um com mensagem própria.

## 39. PRIMEIRA EXPERIÊNCIA

Após onboarding, criar automaticamente a primeira sessão conforme a rotina e mostrar "Seu primeiro treino está marcado." (reduz fricção).

## 40. ESTADOS VISUAIS

Cor não pode ser o único indicador. PENDING neutro; PREPARING atenção; ENGAGED ativo; OBJECTION conversa; COMPLETED sucesso; CANCELLED neutro; NOT_COMPLETED neutro (nunca punitivo).

## 41. ARQUITETURA

Modular: authentication; users; profiles; activities; schedules; sessions; conversations; messages; objections; notifications; AI; analytics. Componentes reutilizáveis, sem duplicação. Services: NotificationService, TrainingSessionService, ConversationService, ObjectionService, AIService, AnalyticsService.

## 42. AI SERVICE

Camada isolada. Recebe: user_profile, training_session, conversation_history, current_state, current_objection. Retorna: response_text, detected_objection, suggested_state, suggested_action, confidence. Sem lógica de IA espalhada no frontend.

## 43. FALLBACK DA IA

Se a API de IA estiver indisponível, o app continua funcionando com respostas pré-configuradas por objeção (cansaço, preguiça, chuva, etc.).

## 44. NOTIFICAÇÕES (push)

Usuário pode ativar/desativar/configurar. Sem spam. Respeitar estado da sessão — se já confirmou, cancelar notificações desnecessárias.

## 45. RESPONSIVIDADE

Mobile-first, mas preparar componentes para tamanhos diferentes (Android pequeno/grande, tablets no futuro).

## 46. ACESSIBILIDADE

Bom contraste; fontes legíveis; áreas de toque adequadas; labels; suporte básico a leitores de tela; não depender só de cor para status.

## 47. FORA DO MVP

Não desenvolver agora: smartwatch, Apple Health, Google Fit, GPS, ranking, comunidade, desafios, dieta, contador de calorias, integração com academias, plano de treino, acompanhamento médico, personal trainer, marketplace, pagamentos, gamificação avançada, voz avançada. Ficam no roadmap futuro.

## 48. ROADMAP

V1 Companheiro de disciplina (perfil + rotina + notificações + conversa + objeções + registro). V2 Memória comportamental. V3 Conversação por voz. V4 Contexto (clima, deslocamento, localização, agenda). V5 Gamificação. V6 Personalidades (Amigo, Coach, Carinhoso, Direto, Engraçado). V7 Companheiro completo.

## 49. CRITÉRIOS DE ACEITAÇÃO DO MVP

1. Criar conta. 2. Completar onboarding. 3. Perfil salvo. 4. Criar rotina. 5. Sistema cria sessões. 6. Home mostra próximo treino. 7. Notificações programadas. 8. Usuário consegue responder. 9. Chat funciona. 10. Sistema identifica objeções. 11. IA responde com contexto. 12. Máquina de estados funciona. 13. Confirmar treino. 14. Cancelar/remarcar. 15. Pós-treino funciona. 16. Feedback salvo. 17. Histórico funciona. 18. Analytics registra eventos. 19. Taxa de resgate calculável. 20. Editar perfil. 21. Excluir conta. 22. Fallback funciona sem IA.

## 50. PRIORIDADE ABSOLUTA

Não adicionar funcionalidades só porque parecem interessantes. Foco: ajudar a pessoa a começar. Pergunta que o MVP precisa responder: "Quando uma pessoa está prestes a desistir de uma atividade física, uma conversa contextualizada consegue ajudá-la a continuar?"

## 51. EXPERIÊNCIA FINAL DESEJADA (referência de tom)

18:00 "Hoje tem treino. Vamos começar?" → 18:10 "Roupa separada?" → usuário "Ainda não." → "O que está te segurando?" → "Estou cansado." → "Cansado fisicamente ou sem vontade de começar?" → "Sem vontade." → "Então não vamos pensar no treino inteiro. Só coloca a roupa e o tênis. Depois você me responde." → "Tá." → "Pronto. Roupa colocada." → "Boa. Agora você já venceu a parte mais difícil: começar." → usuário sai → "Você saiu?" → "Sim." → "Então agora é só chegar lá. Vai." → pós-treino "E aí, você foi?" → "Fui." → "Mais um feito. Não foi sobre vontade. Foi sobre aparecer."

## 52. FRASE CENTRAL DO PRODUTO

"Não deixe a pessoa desistir antes de começar." / "Não é sobre ter vontade. É sobre não desistir de você."

## 53. INSTRUÇÃO FINAL

Construir o app completo com base nesta especificação: frontend, backend, banco de dados, autenticação, CRUD, máquina de estados, notificações, chat, IA, fallback, analytics, histórico, painel administrativo básico. Priorizar o MVP antes de qualquer coisa fora do escopo. Arquitetura limpa, código organizado, componentes reutilizáveis, estrutura preparada para evolução. Priorizar UX, simplicidade e confiabilidade.

**AJUDAR A PESSOA A NÃO DESISTIR ANTES DE COMEÇAR.**
