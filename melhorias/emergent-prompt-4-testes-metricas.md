# Prompt 4/4 — Painel Administrativo, Métricas, Regras Finais e Testes — Companheiro

Prompt final da construção do **Companheiro**, sobre a arquitetura/banco (Prompt 1), telas (Prompt 2) e motor de IA/objeções/estados (Prompt 3). Aqui fechamos com o painel administrativo, as métricas, as regras de negócio consolidadas, o que fica fora do MVP, e os critérios de aceitação que definem quando o MVP está pronto.

## Painel administrativo (uso interno, para validação)

Simples, não precisa ser um dashboard grande. Deve mostrar: usuários, sessões, atividades realizadas, atividades não realizadas, objeções mais frequentes, taxa de resgate, retenção, conversas. Proteger com autenticação/token de admin — não expor publicamente.

## Métricas

- **Usuários**: total, novos, ativos.
- **Treinos**: planejados, realizados, não realizados, remarcados.
- **Conversas**: iniciadas, respondidas, objeções identificadas.
- **Taxa de resgate** (métrica principal do produto): `RESGATES / OPORTUNIDADES_DE_DESISTÊNCIA × 100`. Exemplo: 30 resgates em 100 oportunidades = 30%. Uma "oportunidade de desistência" é uma sessão em que o usuário demonstrou resistência/objeção antes do horário; um "resgate" é quando, após a conversa, ele confirma saída ou conclui o treino mesmo assim.

## Regras de negócio consolidadas (validar com testes)

1. Nunca iniciar jornada de notificações para treino cancelado.
2. Se o usuário confirmar que vai, reduzir mensagens desnecessárias.
3. Se confirmar que saiu, encerrar notificações de preparação pendentes.
4. Remarcação deve atualizar a sessão existente, não criar lixo/duplicata.
5. Se o usuário disser que não está bem, não pressionar.
6. Relato de dor relevante nunca deve gerar incentivo ao exercício.
7. Nenhuma mensagem do app pode gerar culpa (revisar todos os textos contra a lista de frases proibidas do produto).
8. Não enviar mensagens repetitivas/redundantes.
9. Toda resposta da IA deve considerar o contexto real do usuário (perfil + estado da sessão).
10. A conversa deve soar humana, nunca como formulário.

## Fora do escopo deste MVP (não implementar agora)

Smartwatch, Apple Health, Google Fit, GPS, ranking, comunidade, desafios, dieta, contador de calorias, integração com academias, plano de treino, acompanhamento médico, personal trainer, marketplace, pagamentos, gamificação avançada, voz avançada. Ficam para o roadmap (V2 em diante).

## Roteiro de testes / critérios de aceitação do MVP

O MVP só está pronto quando TODOS os itens abaixo funcionam de ponta a ponta:

1. Usuário consegue criar conta.
2. Usuário consegue completar o onboarding.
3. Perfil é salvo corretamente.
4. Usuário consegue criar rotina de treino.
5. Sistema cria as sessões de treino automaticamente a partir da rotina.
6. Tela Hoje mostra corretamente o próximo treino (ou a ausência dele).
7. Notificações são programadas nos horários certos (T-60/45/30/20 + pós-treino).
8. Usuário consegue responder às notificações/perguntas.
9. Chat funciona (envio, recebimento, respostas rápidas, persistência).
10. Sistema identifica corretamente a objeção relatada pelo usuário.
11. IA responde considerando o contexto (perfil + situação + histórico).
12. Máquina de estados transiciona corretamente (sem pular estados inválidos nem repetir notificações após confirmação).
13. Usuário pode confirmar que vai/está indo para o treino.
14. Usuário pode cancelar ou remarcar uma sessão.
15. Fluxo de pós-treino funciona (Sim/Não + sensação + motivo, quando aplicável).
16. Feedback é salvo corretamente vinculado à sessão.
17. Histórico mostra as sessões passadas com status, objeção, conversa e feedback.
18. Analytics registra todos os eventos-chave (lista completa no Prompt 1).
19. Taxa de resgate pode ser calculada corretamente a partir dos dados registrados.
20. Usuário pode editar seu perfil.
21. Usuário pode excluir a própria conta (e todos os dados vinculados são removidos).
22. Se a IA estiver indisponível, o app continua funcionando via fallback, sem quebrar.

Para cada item, escreva/valide um teste (manual ou automatizado) antes de considerar o MVP concluído.

## Prioridade absoluta

Não adicione funcionalidades só porque parecem interessantes. O MVP existe para responder uma única pergunta: **"Quando uma pessoa está prestes a desistir de uma atividade física, uma conversa contextualizada consegue ajudá-la a continuar?"** Tudo que não ajuda a responder essa pergunta é secundário e deve esperar o roadmap (V2+).

## Frase central do produto (para revisar todo texto/UX gerado)

"Não deixe a pessoa desistir antes de começar." / "Não é sobre ter vontade. É sobre não desistir de você."

## Entregável deste prompt

1. Painel administrativo funcional com as métricas listadas, protegido por autenticação de admin.
2. Cálculo correto da taxa de resgate e das demais métricas a partir dos dados reais gerados pelo uso do app.
3. Checklist dos 22 critérios de aceitação validado (marque o que passou/falhou e corrija o que faltar antes de declarar o MVP pronto).
4. Revisão final de todos os textos do app contra a regra "nunca gerar culpa".
