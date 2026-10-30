---
name: gameplay-fsm
description: "Projeta e revisa uma FSM de personagem/inimigo respeitando física determinística, inputs e animações do Re:Dream."
argument-hint: "[personagem ou comportamento]"
user-invocable: true
---

# FSM de gameplay
Antes de refatorar, leia `apps/web/src/practiceSimulation.ts`, `apps/web/src/luciAnimation.ts`, `apps/web/src/protocol.ts` e testes correlatos. A simulação e a animação são camadas distintas.

## Entrega
1. Inventarie estados atuais por comportamento, ex.: `Idle`, `Walk`, `Dash`, `Run`, `Jump`, `Fall`, `Attack`, `ChargeZ`, `Skill`, `Hurt`.
2. Descreva tabela `estado origem | evento | guarda | estado destino | efeito colateral | prioridade`.
3. Separe estados ortogonais: **locomoção**, **combate** e **animação**; não bloqueie a atualização de gravidade ao atacar.
4. Preserve double-tap → dash → hold-run; inverter cancela; dash + ↑ dá Rocket; ↓ no Rocket dá Shadow; chargeZ+release executa MP 1/2/3. Sem skill instantânea.
5. Escreva antes os testes para prioridades de cancelamento, transições de chão/plataforma, input buffer, perda de foco/pause e reset.
6. Extrair de forma incremental; não substituir o simulador inteiro nem quebrar a interface `Snapshot`.

## Critério
Cada transição nova tem ao menos um teste positivo e um negativo; o código não pode deixar ações com estado impossível ou durações infinitas.
