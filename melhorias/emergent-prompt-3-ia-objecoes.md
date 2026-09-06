# Prompt 3/4 — Motor de Notificações, Máquina de Estados, IA e Objeções — Companheiro

Continuando a construção do **Companheiro**, sobre a arquitetura/banco (Prompt 1) e as telas (Prompt 2). Este é o **Prompt 3 de 4**: o coração comportamental do produto — a jornada de preparação, a máquina de estados, o motor de objeções e a IA conversacional. O Prompt 4 cobre testes, métricas e refinamento.

Regra fundamental (repetindo porque é crítica): o app NUNCA gera culpa. Filosofia: "Eu não vou te julgar. Mas também não vou deixar você desistir por qualquer motivo." Diante de impossibilidade real, ajudar a achar alternativa em vez de cobrar.

## Motor de notificações (jornada por sessão)

- **T-60**: "E aí! Hoje tem treino. Vamos começar a nos preparar?"
- **T-45**: "Já separou sua roupa?"
- **T-30**: "Como está sua vontade de ir hoje?" (escala 0 a 10)
- **T-20**: se ainda não houver confirmação de saída: "Percebi que você ainda não foi. Está tudo bem. O que está acontecendo?" — aqui começa a conversa (chat).

## Máquina de estados — NÃO disparar mensagens cegamente

Estados da sessão: `PENDING` → `PREPARING` → `ENGAGED` → `OBJECTION` → `PREPARING_TO_GO` → `LEFT` → `COMPLETED` | `RESCHEDULED` | `CANCELLED` | `NOT_COMPLETED`.

A próxima mensagem/notificação deve depender **sempre** do estado atual da sessão — nunca dispare a jornada inteira de notificações independentemente da interação do usuário. Regras de negócio obrigatórias:

1. Nunca iniciar jornada para um treino já cancelado.
2. Se o usuário confirmar que vai, reduzir mensagens desnecessárias (não continue perguntando o óbvio).
3. Se o usuário confirmar que saiu, encerrar as notificações de preparação restantes.
4. Se o usuário remarcar, atualizar a sessão (não duplicar).
5. Se o usuário disser que não está bem, não pressionar.
6. Se houver relato de dor importante, não incentivar o treino.
7. Não gerar culpa em nenhuma mensagem.
8. Não enviar mensagens repetitivas.
9. A IA deve sempre considerar o contexto do usuário (perfil + situação atual).
10. A conversa deve parecer humana, nunca um questionário automático.

## Motor de objeções

Implemente como categorias estruturadas e reutilizáveis (usadas tanto pelo fallback quanto como guia de instrução para a IA):

- **Cansaço** → "Você está cansado fisicamente ou está sem vontade de começar?"
- **Preguiça** → "Então não vamos pensar no treino inteiro. Só vamos resolver os próximos cinco minutos." Ação sugerida: levantar → colocar roupa → colocar tênis.
- **Frio** → "Eu sei. Vamos fazer um acordo: chega até a porta. Depois você decide."
- **Chuva** → não pressionar; oferecer treino em casa, outro horário, ou remarcação.
- **Trabalho** → "Hoje parece que o problema é falta de tempo. Quer encontrar uma alternativa?" com opções: mais tarde / menos tempo / amanhã / em casa.
- **Filhos** → reconhecer como necessidade real; perguntar se existe outro horário possível; se sim, permitir remarcação com a mensagem "Seu treino não foi cancelado. Só mudou de horário."
- **Desânimo** → usar a `personalized_motivation`/objetivo cadastrado no perfil para reconectar (ex. objetivo = autoestima → "Eu sei que não ver resultado rápido desanima. Mas você começou porque queria cuidar mais de você. Hoje você não precisa provar nada. Só precisa aparecer.").
- **Falta de companhia** → "Você não quer ir sozinho ou realmente não está com vontade de treinar?"
- **Falta de tempo** → oferecer alternativas (igual "Trabalho").
- **Dor** → CRÍTICO: se houver dor relevante, mal-estar importante ou possível lesão, NÃO incentivar o exercício, NÃO diagnosticar, NÃO prescrever tratamento. Resposta seguindo esta linha: "Se você está com dor ou não está se sentindo bem, não quero que você se force. Cuide de você primeiro."

## IA conversacional (AIService, definido no Prompt 1)

A IA deve receber como contexto: nome, atividade, frequência, horário, nível de disciplina, objetivo, motivação, principais objeções cadastradas, trabalho, estudos, filhos, tempo de deslocamento, estado atual da sessão, mensagens recentes da conversa, histórico relevante (objeções recorrentes).

Formato conceitual do contexto a montar antes de chamar o modelo:

```
PERFIL:
Usuário: {nome}
Atividade: {atividade} — {frequência}x por semana
Horário: {horário}
Trabalha: {sim/não} | Filhos: {sim/não}
Principal objeção: {objeção mais frequente}
Objetivo: {objetivo}

SITUAÇÃO:
{ex: Faltam 20 minutos para o treino. Usuário ainda não confirmou saída.}

ÚLTIMA MENSAGEM:
"{mensagem do usuário}"

INSTRUÇÕES:
Responder como um amigo motivador. Ser humano. Não ser agressivo. Não gerar culpa.
Não agir como terapeuta. Investigar antes de aconselhar. Se houver impossibilidade
real, ajudar a encontrar alternativa. Se houver dor ou mal-estar importante, não
incentivar exercício. Manter resposta curta e natural. Fazer apenas uma pergunta
por vez quando apropriado.
```

O `AIService` deve retornar `response_text`, `detected_objection`, `suggested_state` (nova sugestão de estado da sessão), `suggested_action` e `confidence`.

### Fallback (repetindo do Prompt 1, agora com a árvore completa)

Se a API de IA estiver indisponível, usar as respostas pré-configuradas do motor de objeções acima — o app nunca deve quebrar ou travar por falta da IA.

## Memória comportamental (estrutura, não inteligência completa)

Registrar toda vez que uma objeção ocorrer, incrementando `frequency` em `USER_OBJECTIONS` e atualizando `last_occurred_at`. Não é preciso já gerar insights automáticos tipo "você costuma desistir às terças" no MVP, mas o schema e os services devem estar prontos para essa análise no futuro (V2 do roadmap).

## Chat

Toda mensagem trocada (usuário e app) deve ser persistida em `MESSAGES`, vinculada a uma `CONVERSATION` e, quando aplicável, à `TRAINING_SESSION` correspondente. Respostas rápidas contam como `message_type = QUICK_REPLY`.

## Pós-treino (fecha o ciclo da sessão)

Depois do horário previsto, perguntar "E aí, você foi?" (Sim/Não) e seguir o fluxo definido no Prompt 2, atualizando o status da sessão para `COMPLETED` ou `NOT_COMPLETED` e salvando o registro em `FEEDBACK`.

## Entregável deste prompt

1. Motor de notificações programando os disparos T-60/T-45/T-30/T-20/pós-treino por sessão, respeitando a máquina de estados (sem duplicar, sem enviar após confirmação/saída/cancelamento).
2. Máquina de estados implementada como transições válidas (não permitir qualquer estado ir para qualquer estado).
3. Motor de objeções com as categorias acima, usado como fallback e como instrução de sistema para a IA.
4. AIService completo, com contexto montado a partir do perfil + sessão + histórico, e fallback funcional quando a IA está indisponível.
5. Persistência de toda conversa em `CONVERSATIONS`/`MESSAGES`, atualizando `USER_OBJECTIONS` a cada objeção identificada.
