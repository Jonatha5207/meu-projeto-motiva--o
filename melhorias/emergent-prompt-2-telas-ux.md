# Prompt 2/4 — Telas e UX — Companheiro

Continuando a construção do **Companheiro** (app de disciplina para atividade física cuja missão é "não deixar a pessoa desistir antes de começar"). Este é o **Prompt 2 de 4** (Telas e UX), construído sobre a arquitetura e banco de dados do Prompt 1. Os próximos prompts tratam de IA/Motor de Objeções e Testes/Métricas.

Lembre-se da regra fundamental: o app nunca gera culpa; é acolhedor, direto, humano — "o amigo que não deixa você desistir", nunca um coach agressivo ou robô genérico.

## Navegação principal

Bottom Navigation com 4 itens: **Hoje**, **Rotina**, **Histórico**, **Perfil**. A tela "Hoje" é o coração do app.

## Onboarding (curto, sem excesso de perguntas)

**Tela 1 — Boas-vindas**
Título: "Vamos cuidar da sua disciplina?"
Texto: "Eu não estou aqui apenas para lembrar você de treinar. Quero entender sua rotina e ajudar justamente nos dias em que sua vontade de desistir aparecer."
CTA: COMEÇAR

**Atividade** — "Qual atividade você pratica?" Cards: Academia, Corrida, Caminhada, Natação, Ciclismo, Crossfit, Dança, Outra (uma atividade principal; banco já preparado para múltiplas atividades).

**Frequência** — "Quantas vezes por semana você pretende praticar?" Opções 1–6, Todos os dias.

**Dias** — "Em quais dias você normalmente pratica?" Checkbox Segunda–Domingo.

**Horário** — "Qual horário normalmente?" Time picker (ex. 19:00).

**Deslocamento** — "Quanto tempo você leva para chegar ao local?" (<10min, 10–20, 20–30, 30–60, >1h). "Como você chega?" (A pé, Carro, Ônibus, Metrô/trem, Bicicleta, Outro). Sem GPS.

**Rotina pessoal** — "Você trabalha?" / "Você estuda?" / "Você tem filhos?" (Sim/Não) — usado só para contexto da IA.

**Principais objeções (tela importante)** — "Quando você pensa em não treinar, geralmente é por quê?" Múltipla escolha: Cansaço, Preguiça, Falta de tempo, Trabalho, Filhos, Frio, Chuva, Falta de vontade, Desânimo, Não vejo resultado, Falta de companhia, Vergonha, Dor, Outro. Salvar todas as respostas.

**Motivação** — "Por que você quer praticar atividade física?" Opções: Melhorar minha saúde, Emagrecer, Melhorar minha autoestima, Ter mais disposição, Cuidar de mim, Melhorar minha aparência, Acompanhar meus filhos, Envelhecer melhor, Melhorar meu desempenho, Realizar um sonho, Outro + campo livre "Quero escrever com minhas próprias palavras."

**Nível de disciplina** — "Qual dessas frases mais parece com você?" A) Estou começando agora. B) Eu até consigo manter uma rotina. C) Sou bastante disciplinado. D) Eu começo, paro e começo de novo.

**Resumo do perfil** — Mostrar atividade+frequência, horário, principal dificuldade, objetivo. Mensagem: "Nos dias de treino, eu vou estar aqui para ajudar você a não desistir." CTA: "FECHADO. VAMOS NESSA."

**Primeira experiência**: logo após o onboarding, criar automaticamente a primeira sessão de treino conforme a rotina e mostrar "Seu primeiro treino está marcado." (reduz fricção).

## Tela Hoje (dashboard central)

Simples: ícone/nome da atividade, horário, contagem regressiva ("Faltam: 2h15"), status textual (ex. "🟡 Preparação"), CTA principal "CONVERSAR COM MEU COMPANHEIRO". Se não houver treino no dia: "Hoje você não tem atividade planejada." + mostrar o próximo treino.

### Home inteligente — a tela muda conforme o estado da sessão

- Sem treino: "Hoje está tranquilo. Seu próximo treino é amanhã às 19h."
- Treino próximo: "Hoje tem treino."
- Preparação: "Vamos começar?"
- Resistência/objeção: "O que está te segurando?"
- Usuário saiu: "Boa. Agora é só chegar lá."
- Treino concluído: "Mais um feito."

## Tela Rotina

Visualizar e editar: atividade, dias, horários, local, duração, deslocamento. Permitir adicionar, editar, excluir, ativar/desativar um treino.

## Tela Histórico

Calendário simples. Cada sessão com status visual: 🟢 Realizado, 🔴 Não realizado, 🟡 Remarcado. Ao clicar em uma sessão, mostrar atividade, horário, status, objeção identificada, conversa, feedback e sensação relatada.

## Tela Perfil

Mostrar nome, atividade principal, objetivo, frequência, nível de disciplina, principais objeções, motivação. Configurações: notificações, horário, privacidade, conta, sair. Deve ser possível editar o perfil e excluir a conta (com todos os dados).

## Chat (interface tipo app de mensagens)

Avatar do Companheiro, bolhas de mensagem, respostas rápidas, campo de texto, botão de enviar, botão de áudio preparado para o futuro (não implementar voz avançada agora). Respostas rápidas sugeridas: Estou cansado, Estou sem vontade, Estou atrasado, Está frio, Está chovendo, Estou sem tempo, Aconteceu alguma coisa, Vou me preparar, Já saí.

Tom das respostas do app: curto e natural, nunca um parágrafo de coach. Exemplo bom: "Entendi. Mas me responde uma coisa: você está cansado fisicamente ou sem vontade de começar?" Exemplo ruim (evitar): "É perfeitamente compreensível que você esteja sentindo cansaço após um dia de trabalho e existem diversas estratégias..."

## Pós-treino

Perguntar "E aí, você foi?" com botões SIM/NÃO.

- **Se sim**: "Sabia que você conseguiria." → "Como você se sentiu?" (😀 Muito bem, 🙂 Bem, 😐 Normal, 😫 Foi difícil) → "Mais um treino feito. Não foi sobre vontade. Foi sobre aparecer."
- **Se não**: sem culpa — "Tudo bem. Amanhã é uma nova oportunidade." → "Quer me contar o que aconteceu?" (Cansaço, Falta de tempo, Preguiça, Problema pessoal, Não estava bem, Outro). Salvar a resposta.

## Microinterações

Pequenas animações discretas: check ao concluir preparação, progresso da sessão, transição suave entre telas, feedback visual ao completar treino, animação leve de comemoração. Não exagerar.

## Estados visuais

Nunca depender só de cor para comunicar status. PENDING = neutro. PREPARING = atenção. ENGAGED = ativo. OBJECTION = tom de conversa. COMPLETED = sucesso. CANCELLED = neutro. NOT_COMPLETED = neutro, nunca punitivo (nada de vermelho/alarme aqui).

## Entregável deste prompt

Todas as telas acima implementadas e navegáveis, consumindo os endpoints/services do Prompt 1, com estado de UI reagindo ao status real da sessão vindo do backend. O motor de objeções e as respostas da IA propriamente ditas serão aprofundados no Prompt 3 — aqui, o chat já deve existir e funcionar com o fallback simples definido no Prompt 1.
