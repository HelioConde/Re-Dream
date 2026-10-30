# Re:Dream — Eventos tipados do combate offline

**Escopo:** modo Praticar, comunicação **dentro do cliente**. Implementado segundo `.claude/skills/gameplay-events/SKILL.md`, com a skill de backlog e debug. **Não é protocolo WebSocket, nem cálculo de dano pelo HUD.**

## Contrato implementado

| Evento | Quando ocorre | Payload | Consumidores | Proteção |
| --- | --- | --- | --- | --- |
| `impactConfirmed` | O simulador confirmou alcance, direção, altura e vida do alvo | `impact: PracticeImpact` (sequence/damage/x/y/direction/kind) | Histórico de treino | Um único evento por acerto real; mantém o `PracticeImpact` existente para VFX Phaser |
| `mpChanged` (`hit`) | Impacto recupera MP e altera a barra | `before`, `after`, `reason:'hit'` | Histórico | Não emite no limite de 300 MP, sem mudança |
| `mpChanged` (`skill`) | Somente soltando Z com carga suficiente e MP disponível | `before`, `after`, `reason:'skill'`, `level` | Histórico | Não emite quando não houve cast; sem atalhos instantâneos |
| `comboChanged` | Acerto acrescenta estágio, ou expiração do combo | `combo`, `bestCombo` | Histórico | Emite no início do timeout, uma vez, não a cada frame |
| `dummyDefeated` | Acerto real reduz HP a 0 | `total` | Histórico | Sem duplicação enquanto dummy aguarda respawn |
| `reset` | Reiniciar treino | nenhum além de `sequence` | Histórico (limpa itens) | Subscrição continua válida até unmount |

Todos os eventos incluem **`sequence` local monotônico**. `PracticeArena.subscribe(listener)` retorna uma função de unsubscribe; `PracticeMode` inscreve-se via `useEffect` e desinscreve automaticamente ao desmontar. O histórico guarda **apenas os três últimos fatos**, evitando um log sem limite e não interferindo no canvas. O fluxo de estado do jogador e a barra de MP continuam derivados do snapshot/estatísticas do simulador.

## Compatibilidade com VFX existentes

`GameCanvas` já usava `snapshot.impact.sequence` para gerar dano flutuante. Nesta PR ele **não é migrado**: a mesma ocorrência confirmada gera um evento local para o histórico e atualiza o campo de impacto para VFX, **sem disparar duas animações**.

Correção associada: `PracticeArena.reset()` não reinicia mais `impactSequence`, porque o canvas mantém o último id visto. Um novo golpe após reinício precisa de id diferente para não perder o efeito visual.

## Ordem por ação

1. **Acerto simples válido:** `impactConfirmed` → `mpChanged(hit)` se MP realmente aumentou → `comboChanged` depois de registrar combo.
2. **Magia Z válida:** `mpChanged(skill)` ao consumir MP → `impactConfirmed` caso alcance o alvo → `mpChanged(hit)` se recuperar MP → `dummyDefeated` em caso de KO. O simulador de combo atual não adiciona `comboChanged` automaticamente a toda magia.
3. **Ataque que erra:** nenhum evento de impacto/MP ganho/combo.
4. **Reset:** `reset` e limpeza de histórico; sem lançar magia nem repetir golpes.
5. **Pausa:** `suspend()` anula carga e buffers sem disparar habilidades/eventos artificiais.

## Como testar

- Campo de Prática: posicione Luci perto do dummy, aperte Z e verifique `Acerto confirmado`, MP recuperado e combo.
- Segure Z por **0,65 / 1,30 / 1,95 segundo(s)** e solte: custo MP1/MP2/MP3; pressionar A/S/D/K não conjura.
- Ataque fora do alcance: histórico não deve registrar impacto.
- Reinicie o treino e dê novo golpe: o dano flutuante deve reaparecer com novo id de impacto.
- Faça ↓ na plataforma fina: a descida anterior continua independente.
- Confira em viewport mobile; UI automatizada/visual e avaliação da sensação ainda precisam de teste humano.

**Próximos passos (não implementados):** migração incremental dos VFX e SFX para eventos, efeitos sonoros originais, FSM de combate de Z/ataques, autoritatividade online e proteção contra duplicação em rede.
