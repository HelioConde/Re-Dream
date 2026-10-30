# GDD enxuto — Re:Dream
**Estado:** documento vivo, versão inicial (2026-10-30). Fontes de verdade: `README.md`, `apps/web/src/practiceSimulation.ts`, `apps/server/src/sim.ts`.

## Visão e fantasia do jogador
Jogo **original** de ação e plataformas 2D com atmosfera de fantasia, combate ágil e cooperação online. O jogador escolhe um herói, experimenta movimentação expressiva, enfrenta inimigos e domina combos com leitura clara de impacto. Referências de ação arcade inspiram apenas a sensação dos controles.

## Pilares
1. **Resposta imediata:** setas, dash, corrida após o segundo toque segurado e ataques rápidos.
2. **Domínio gradual:** launcher, perseguição aérea, juggle, Otto, Rocket/Shadow Step e carga de MP oferecem profundidade sem atalhos automáticos.
3. **Cooperação clara:** salas e servidor autoritativo; sem prometer persistência/escala não implementadas.
4. **Identidade própria:** Luci, visuais originais quando disponíveis, licenças auditadas.

## Loop de jogo
**Implementado:** seleção de personagem → escolher modo Praticar ou criar/entrar em sala → movimentar, pular, atacar → no multiplayer, combater ondas e chefe de demonstração → voltar à navegação.

**Ainda proposto:** objetivos de missão variados → recompensas/progressão persistente → regiões e desafios desbloqueáveis. Não tratar esse segundo fluxo como já jogável.

## Mecânicas atuais
| Sistema | Situação | Fonte |
| --- | --- | --- |
| Andar, dash por duplo toque, corrida ao segurar segundo toque | Praticar offline | `practiceSimulation.ts` |
| Salto, Rocket/Shadow Step, dash cancel, descida de plataforma | Praticar offline | `practiceSimulation.ts` |
| Combo básico, launcher, juggle, mergulho/estocada e Otto adaptado | Praticar offline | `practiceSimulation.ts` |
| Segurar Z e **soltar** para magia MP1/MP2/MP3 | Praticar offline | `practiceSimulation.ts` |
| Salas online, ondas e chefe de demonstração | Multiplayer | `apps/server/src/sim.ts` |
| Progressão persistente, loot, itens equipáveis, novas regiões | Pendente | escopo futuro |

**Controles de referência do modo Praticar:** ←/→ andar; duplo toque faz dash e segurar o segundo toque mantém corrida; ↑ pula; Z inicia golpe e, ao segurar/soltar, conjura níveis 1/2/3 conforme MP disponível. A/S/D não são atalhos de magia. J/W são alternativas locais documentadas. O multiplayer tem controles diferentes até eventual unificação validada.

## Plataforma e tecnologia
Cliente React + Phaser 4 + TypeScript, publicado estaticamente via GitHub Pages; servidor Node.js/WebSocket hospedado à parte. Desktop e dispositivos móveis são alvos; desempenho e responsividade precisam de medição real por dispositivo.

## MVP e restrições
- **MVP atual:** demonstrar sensação de combate offline + cooperação básica em demo, com sprites/controles consistentes.
- **Fora do MVP:** loja, monetização, leaderboard global, banco de dados obrigatório, port nativo, classes/armas completas.
- **Restrição de IP:** não copiar personagens, mapas, áudio ou código de jogos de referência.
- **Qualidade:** `npm test` e `npm run build`, QA visual manual, verificação de inputs e colisões, revisão de licenças dos assets.

## Próxima versão a validar
Unificar a definição de estados de movimentação/combatentes; desacoplar feedback visual via eventos; medir *frame time* e reduzir regressões sem quebrar o multiplayer. Essas são **propostas**, não itens já implementados.

## Histórico de decisões
- 2026-10-30: GDD inicial redigido a partir da base existente e do fluxo de skills adaptado.
- Qualquer mudança em controle/MP deve atualizar este GDD, documentação do gameplay e testes no mesmo PR.
