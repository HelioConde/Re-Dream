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
| Andar, dash por duplo toque, corrida ao segurar segundo toque | Praticar offline, agora com decisão de estado/velocidade extraída para FSM pura | `locomotionFsm.ts`, `practiceSimulation.ts` |
| Salto, Rocket/Shadow Step, dash cancel, **↓ sozinho para descer plataforma vazada** | Praticar offline | `practiceSimulation.ts` |
| ↓ para descer plataforma fina: entrada, predição e servidor autoritativo | Cliente + servidor online (requer deploy do backend) | `GameCanvas.tsx`, `prediction.ts`, `apps/server/src/sim.ts` |
| Combo básico, launcher, juggle, mergulho/estocada e Otto adaptado | Praticar offline | `practiceSimulation.ts` |
| Segurar Z e **soltar** para magia MP1/MP2/MP3 | Praticar offline | `practiceSimulation.ts` |
| Event Bus tipado para impacto, MP, combos, KO e reset | Praticar offline, histórico visual local | `practiceEvents.ts`, `PracticeMode.tsx` |
| Salas online, ondas e chefe de demonstração | Multiplayer | `apps/server/src/sim.ts` |
| Cenário original Bosque das Constelações, Sentinela de Cristal e HUD do Luci | Implementado no cliente; QA visual em browser pendente | `apps/web/public/art/arena-dream.svg`, `GameCanvas.tsx`, `PracticeMode.tsx` |
| Progressão persistente, loot, itens equipáveis, novas regiões | Pendente | escopo futuro |

**Controles de referência do modo Praticar:** ↓ em uma plataforma vazada atravessa a plataforma (nunca o chão sólido); ↓+Z/J na borda prioriza Otto; ↓ no ar preserva Shadow Step. ←/→ andar; duplo toque faz dash e segurar o segundo toque mantém corrida; ↑ pula; Z inicia golpe e, ao segurar/soltar, conjura níveis 1/2/3 conforme MP disponível. A/S/D não são atalhos de magia. J/W são alternativas locais documentadas. O multiplayer tem controles diferentes até eventual unificação validada.

## Plataforma e tecnologia
Cliente React + Phaser 4 + TypeScript, publicado estaticamente via GitHub Pages; servidor Node.js/WebSocket hospedado à parte. Desktop e dispositivos móveis são alvos; desempenho e responsividade precisam de medição real por dispositivo.

## MVP e restrições
- **MVP atual:** demonstrar sensação de combate offline + cooperação básica em demo, com sprites/controles consistentes.
- **Fora do MVP:** loja, monetização, leaderboard global, banco de dados obrigatório, port nativo, classes/armas completas.
- **Restrição de IP:** não copiar personagens, mapas, áudio ou código de jogos de referência.
- **Qualidade:** `npm test` e `npm run build`, QA visual manual, verificação de inputs e colisões, revisão de licenças dos assets.

## Próxima versão a validar
A decisão de estados de locomoção offline já foi extraída como FSM pura, documentada em `docs/LOCOMOTION_FSM.md` e ligada ao seletor de sprites e indicador de ESTADO. **Ainda proposto:** extrair FSM de combate (incluindo cargas Z), migrar gradualmente efeitos visuais e sons originais para o Event Bus e medir *frame time* com hardware real. O Event Bus local e o histórico de combate já foram implementados; a migração do VFX Phaser ainda não.

## Direção de arte
O feedback do jogador (2026-10-30) confirma melhora na fluidez, porém indica gráficos distantes da experiência desejada. A prioridade passou a ser **coerência visual da arena, personagens e animações**, acima de novas mecânicas. A primeira intervenção troca o palco geométrico por cena original em camadas e um novo alvo desenhado, sem considerar a qualidade de arte final resolvida. Ver `docs/ART_DIRECTION_RE_DREAM.md`.

## Histórico de decisões
- 2026-10-30: GDD inicial redigido a partir da base existente e do fluxo de skills adaptado.
- 2026-10-30: Descida de plataforma passou a exigir apenas ↓ (toque curto também funciona), preservando Otto e Shadow Step; validação lógica em testes de simulação local.
- 2026-10-30: Relato de playtest: ↓ não funcionou. Identificada lacuna no multiplayer (cliente não enviava DOWN, servidor descartava a tecla e predição não atravessava plataforma); adicionados testes para a ponte de input e para o backend. Ajuda de teste do treino recebeu posicionamento na plataforma e indicador de pouso. Publicar o backend separadamente é obrigatório para paridade online.
- 2026-10-30: FSM incremental de locomoção implementada offline, preservando dash→run, Rocket/Shadow, descida da plataforma, Otto e magias exclusivamente por Z. O servidor de multiplayer não foi alterado nesta etapa.
- 2026-10-30: Event Bus tipado de treino para acertos, MP, combos, KO e reset, com histórico limitado de eventos. Impactos mantêm IDs crescentes mesmo após reset; VFX existente preservado (`docs/PRACTICE_EVENTS.md`).
- Qualquer mudança em controle/MP deve atualizar este GDD, documentação do gameplay e testes no mesmo PR.
