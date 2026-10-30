# Backlog técnico e de design — Re:Dream
**Atualização:** 2026-10-30. Itens são **propostas de implementação**, não funcionalidades concluídas. Prioridade relativa, não prazo.

## Épico A — Núcleo de combate determinístico
| ID | Ordem | Tarefa verificável | Dependências | Aceite |
| --- | --- | --- | --- | --- |
| RD-A01 | Concluído no eixo de locomoção; combate pendente em RD-A03 | Tabela e prioridades Idle/Walk/Dash/Run/Rise/Fall/Rocket/Shadow, eventos de plataforma e camada ortogonal de Z | `docs/LOCOMOTION_FSM.md`; testes da FSM |
| RD-A02 | Implementado incrementalmente no treino | Extrair decisão pura do estado de movimento e velocidade, conectar snapshot, HUD e seletor de sprites | Testes da FSM, arena e animação; QA manual ainda pendente |
| RD-A03 | 3 | Extrair FSM de combate e regras de cancelamento | A01/A02 | Z breve=golpe; Z segurado+solto=magia; A/S/D não conjuram |
| RD-A04 | 4 | Portar regras aprovadas ao multiplayer autoritativo (se solicitado) | A02/A03 | Testes de rede validam latência, anti-cheat e reconciliação |

## Melhoria aplicada — interação com plataformas
| ID | Estado | Entrega | Evidência |
| --- | --- | --- | --- |
| RD-A05 | Corrigido após feedback negativo do playtest; backend exige deploy | ↓ sozinho atravessa plataforma no treino e agora passa da captura Phaser à predição e simulação autoritativa online; botão de teste e aviso de plataforma no treino | Novos testes de input, predição e servidor; validar com o usuário no navegador e no servidor remoto atualizado |

## Épico B — Eventos e apresentação
| ID | Ordem | Tarefa verificável | Dependências | Aceite |
| --- | --- | --- | --- | --- |
| RD-B01 | Implementado no treino | Especificar eventos tipados de impacto confirmado, combo, MP, derrota e reset | `docs/PRACTICE_EVENTS.md`, testes de payload/ordem |
| RD-B02 | Implementado no treino | Event Bus por arena com sequência monotônica, unsubscribe e limpeza do histórico | Testes do bus e da simulação; nenhum WebSocket alterado |
| RD-B03 | Parcial: feed de eventos no HUD | Histórico discreto recebe bus; VFX ainda lê `snapshot.impact`, SFX não migrado | Testes lógicos; QA visual humano pendente |

## Épico C — QA, performance e lançamento
| ID | Ordem | Tarefa verificável | Dependências | Aceite |
| --- | --- | --- | --- | --- |
| RD-C01 | 1 | Capturar baseline real (desktop e mobile): FPS, frame time, memória, renderização | Nenhuma | Ambiente, método, amostra e dados arquivados; nada estimado |
| RD-C02 | 2 | Identificar hot paths da simulação e render a partir das medições | C01 | Regressão e ganho documentados, antes/depois |
| RD-C03 | 3 | Automatizar smoke tests de navegação, inputs e canvas | A02/B02 | Teste reproduzível em resolução desktop/mobile |
| RD-C04 | 4 | Auditar licenças de sprites, shaders e SFX antes da publicação comercial | Nenhuma | Fonte e licença de cada asset usado registradas |

## Definição de pronto
- Critérios observáveis implementados com cobertura automatizada da lógica.
- `npm test` e `npm run build` aprovados.
- Alterações visuais observadas em um navegador com registro de evidência; sem declarar QA manual quando não houve.
- Não mudar contrato de rede por acidente; comparar comportamento offline/online.
- Documentação e controles do GDD atualizados com a implementação.
- PR separado por mudança lógica; rollback claro.

## Fila para seleção
**Próxima história sugerida:** RD-A03 (FSM de combate e carga Z). Depois concluir RD-B03 com feedback VFX/SFX original e QA visual, mantendo servidor WebSocket isolado. Não misturar epics grandes numa PR.
