---
name: perf-audit
description: "Audita gargalos de loop de jogo, React, WebSocket e assets com medições reais e sem inventar FPS."
argument-hint: "[praticar | multiplayer | assets | full]"
user-invocable: true
---

# Auditor de performance — Re:Dream
1. Localize hot paths: `GameCanvas.tsx` (draw/render a cada frame), `practiceSimulation.ts` (step), `apps/server/src/sim.ts` (ticks), React HUD (render), texturas e carregamento.
2. Liste possíveis alocações em loop, mapas sem limpeza, iterações, re-render desnecessário, troca de texturas, overhead de partículas e frequência de mensagens de rede.
3. **Medição obrigatória para números:** registrar plataforma, navegador, tamanho de tela, build, amostras (frame time p50/p95, FPS, memória onde disponível), versão antes/depois. Sem medição: `NÃO MEDIDO`.
4. Meça com ferramentas reais de performance (Performance panel, instrumentos do jogo e Node profiler); não converter complexidade teórica em porcentagens de ganho.
5. Priorize melhorias por impacto, risco e esforço, preserve `prefers-reduced-motion`.
6. Para cada mudança, mantenha teste funcional e visual comparativo; não acelerar o jogo alterando o `dt` de maneira incorreta.

## Entrega
Tabela `gargalo | evidência | impacto medido ou NÃO MEDIDO | ação | risco`, plano de teste e regressões.
