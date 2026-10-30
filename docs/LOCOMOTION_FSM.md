# Re:Dream — FSM de locomoção do Luci (versão incremental)

**Escopo:** modo Praticar offline; integrado em `apps/web/src/locomotionFsm.ts`, `practiceSimulation.ts` e `luciAnimation.ts`. **Não substitui** a física de plataformas nem o simulador autoritativo multiplayer. O servidor remoto exige publicação separada.

## Estados e prioridades
A decisão de locomoção é pura e determinística. A simulação permanece responsável por toques e duração do dash, salto, gravidade, colisão, ataque e queda entre plataformas.

| Prioridade | Estado | Condição | Velocidade horizontal relevante |
| --- | --- | --- | --- |
| 1 | `shadow` | No ar e dentro da janela Shadow Step | 356,5 px/s por direção; queda acelerada é da simulação |
| 2 | `rocket` | No ar e dentro da janela Rocket Step | 715 px/s; sem seta mantém a direção do Rocket |
| 3 | `rise` / `fall` | No ar com velocidade Y negativa / não negativa | 310 px/s no movimento comum |
| 4 | `dash` | No solo e dentro da janela do duplo toque | 685 px/s |
| 5 | `run` | No solo, segundo toque continuou segurado depois do dash | 455 px/s |
| 6 | `walk` | No solo, direção ativa | 310 px/s |
| 7 | `idle` | Sem movimento | 0 px/s |

**Importante:** a velocidade do dash é aplicada durante sua janela mesmo que a física já esteja no ar; a visualização prefere o estado vertical nesse caso. O golpe, a magia carregada e as animações de combate são uma **camada ortogonal**; nunca interrompem a gravidade.

## Tabela de transições
| Origem | Evento / guarda | Destino | Efeito / prioridade |
| --- | --- | --- | --- |
| idle | Pressionar uma seta | walk | Andar normalmente |
| walk | Segundo toque na mesma direção em até 290 ms | dash | Abre janela de 240 ms e arma corrida |
| dash | Janela termina **com segundo toque ainda segurado**, no solo | run | Dispara uma única contagem de corrida |
| dash | Solta segunda seta antes do fim | idle/walk | Encerra dash curto normalmente; corrida não é armada |
| run | Solta a seta | idle | Para, sem novo dash |
| dash/run | Nova seta na direção contrária | walk | Cancela movimento avançado, preserva direção contrária |
| dash | Pula durante a janela, sem perseguição aérea ativa | rocket | Salto do Rocket e fim da janela de dash |
| rocket | Pressiona ↓ enquanto airborne | shadow | Cancela Rocket e acelera a descida |
| rise | Vy se torna não negativa | fall | Continua aplicando gravidade |
| fall/shadow/rocket | Colide com plataforma ou chão | idle/walk | Anula estado aéreo; plataforma fica atravessável |
| chão/plataforma fina | ↓ sozinho, sem golpe durante janela de 120 ms | fall | Drop-through da simulação; não atravessa chão sólido |
| chão/plataforma fina | ↓+Z/J na janela de 120 ms | ataque/Otto | **Prioridade de combate**, sem drop acidental |
| qualquer | Segura Z | locomotion inalterada | Carga MP é ortogonal; só **soltar Z** conjura |
| qualquer | Pausar/reiniciar | idle (quando no solo) | Limpa dash/run/rocket/Shadow e carga pendente |

A FSM decide `state`, `vx`, `running`, `runArmed` e `startedRun`, consumidos pelo simulador a cada passo. Depois de aplicar gravidade e colisões, o snapshot recebe a classificação pós-física `player.locomotion`, usada pelo seletor de sprites e pelo indicador **ESTADO** no HUD.

## Testes / limitações
- `locomotionFsm.test.ts`: transições positivas e negativas, prioridade especial, guardas e estado expirado.
- `practiceSimulation.test.ts`: integração com dash→run, movimento aéreo, queda de plataforma, pausa e Z.
- `luciAnimation.test.ts`: animações originais Walk/Dash/Run/Jump e prioridade de golpes/MP.
- Conservar as regressões de input e servidor de plataforma da PR #11.
- A FSM **não cobre ainda** combate inteiro (`RD-A03`), enemy AI, animações exclusivas de Shadow Step, nem rede multiplayer (`RD-A04`). Implementá-las em PRs separados.
- QA de sensação no navegador ainda depende do playtest humano; testes unitários não medem a qualidade das animações.
