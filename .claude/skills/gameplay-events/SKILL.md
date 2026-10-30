---
name: gameplay-events
description: "Desenha Event Bus local tipado para notificar UI, VFX e áudio sem acoplar simulação e transporte de rede."
argument-hint: "[eventos ou sistema]"
user-invocable: true
---

# Event Bus local
Leia `apps/web/src/protocol.ts`, `apps/web/src/practiceSimulation.ts`, `apps/web/src/GameCanvas.tsx` e `apps/web/src/PracticeMode.tsx`.

## Contrato
1. Primeiro identifique eventos que **já existem** (ex.: `PracticeImpact.sequence`); não crie segundo canal sem plano de migração.
2. Especifique `nome | emissor | payload tipado | quando emitido | assinantes | deduplicação`.
3. Prefira emissão de fatos somente após colisão confirmada: `impactConfirmed`, `comboChanged`, `mpChanged`, `dummyDefeated`.
4. Não coloque funções React/Phaser dentro da simulação; assinaturas retornam função de unsubscribe; limpar listeners em desmontagem, pausa e reset.
5. Evite eventos por frame para informações que podem ser derivadas do snapshot. Preserve ordenação de `sequence` e proteção contra impactos duplicados após reset.
6. **Não substituir WebSocket por Event Bus**. Rede continua autoritativa; bus é detalhe interno de apresentação.
7. Testes: emissão única, ordem, ausência de listeners após unsubscribe, reset e ausência de side effects ao importar.

## Saída
Plano de API TypeScript, tabela de eventos, migração incremental e testes. Só implementar após delimitar o escopo da feature.
