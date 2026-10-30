# Re:Dream — instruções para agentes de programação

Este repositório contém um jogo **original** de ação/plataformas 2D. O cliente usa React, TypeScript, Phaser 4 e Vite; o servidor multijogador usa Node.js e WebSocket.

## Leia antes de alterar código
1. `docs/GDD_RE_DREAM.md`: visão, escopo, regras implementadas versus propostas.
2. `docs/AI_GAME_STUDIO.md`: catálogo de nove skills locais e fluxo de trabalho.
3. `docs/BACKLOG_RE_DREAM.md`: ordem de implementação e critérios.
4. `docs/GAMEPLAY_ARCADE_REFERENCE.md`: descrição do protótipo de combate (verifique contra o código; pode estar desatualizado).

## Regras obrigatórias
- **Re:Dream apenas**: não tocar em outros repositórios, especialmente Slimekeepers, sem pedido explícito.
- **Nunca copiar** códigos, artes, áudio, logotipos, personagens ou mapas de Grand Chase ou outros jogos. Referências servem para *feel*, não para reprodução de propriedade intelectual.
- O modo `#praticar` roda simulação local em `apps/web/src/practiceSimulation.ts`; o multiplayer usa `apps/server/src/sim.ts`. Não levar regras offline para o servidor sem planejamento, validação de autoridade e testes de rede.
- **Combate offline**: Z é a única tecla de conjuração; segurar e **soltar** Z carrega/ativa magia de MP 1/2/3. A/S/D/K nunca disparam magia no modo Praticar.
- Preservar duplo toque de direção → dash; segurar o segundo toque → corrida; Rocket/Shadow Step, Otto, launcher e juggle quando alterar controles.
- Prefira alterações pequenas, com critérios observáveis, testes e rollback possível. Nunca afirmar que uma animação/feature está funcional sem executar verificações adequadas.
- Após alterações em TypeScript: `npm test` e `npm run build`. Em mudanças visuais, testar no navegador e conservar evidência visual; testes unitários não validam aparência nem *game feel*.
- Não introduzir banco de dados/backend obrigatório no modo Praticar ou no GitHub Pages; páginas estáticas não executam WebSocket server.
- Não inventar benchmarks, métricas de FPS, qualidade de gameplay nem licenças de assets.

## Fluxo recomendado
`gdd-dinamico` → `backlog-gameplay` → `gameplay-fsm` ou `gameplay-events` → implementação → `debug-stacktrace` / `perf-audit` → QA / análise jogável → PR.

As skills compatíveis com Claude Code ficam em `.claude/skills/<nome>/SKILL.md`. No Codex/ChatGPT, leia o arquivo da skill e aplique seu procedimento como instrução do projeto; não presuma que o comando `/nome` será registrado automaticamente.
