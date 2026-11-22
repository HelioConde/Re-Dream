# Re:Dream → Eclipse Vanguard Godot — paridade dos botões

**Fonte:** `apps/web/src/inputMapping.ts` e `apps/web/src/PracticeMode.tsx` na branch histórica `archive/redream-phaser-before-godot-20261122`.

## Teclado — modo Praticar do Re:Dream

| Original | Godot Eclipse Vanguard | Resultado |
| --- | --- | --- |
| ← / → | ← / → (+ A/D extra) | Anda; duplo toque inicia dash e manter segunda tecla ativa corrida |
| ↑ / W | ↑ / W | Pula; ↑/W+J ou Z tenta launcher |
| ↓ | ↓ (+ S extra) | Desce plataforma vazada; durante Rocket é Shadow Step |
| ↓ + Espaço | ↓ + Espaço | Descida explícita alternativa de plataforma |
| J | J | Ataque alternativo/combo, aéreo e golpe de dash |
| Z | Z | Ataque principal ao pressionar, segurar/soltar MP1–MP3 |
| Dash + ↑ | Dash + ↑ | Rocket Step |
| ↓ durante Rocket | ↓ durante Rocket | Shadow Step |

A versão Godot ainda não reproduz perfeitamente todas as regras do treino Phaser, especialmente Otto e juggling. **Botão equivalente não significa mecânica equivalente.**

## Teclado — extras compatíveis

Na experiência multiplayer anterior, `K/X` eram botões de skill. Na versão Godot, `K/X` passam a ativar o especial direto; `L` permanece como alternativa. **H** usa o ataque pesado do protótipo Godot; **Shift** faz dash opcional e **R/Enter** reinicia após derrota. Esses extras não substituem `J/Z`.

## Mobile e navegador

A camada `scripts/touch_controls.gd` desenha os **seis botões originais do treino**: **◀ ▶ ↑ ↓ J Z**. São `TouchScreenButton` nativos da Godot, com ações InputMap; é possível manter duas ações ao mesmo tempo, como mover e atacar ou ↑+Z. Os botões aparecem na exportação Web e em dispositivos touchscreen; no desktop nativo ficam ocultos. A tecla ↓ funciona como movimento relativo à plataforma e ↑ como pulo/modificador de ataque.

Controles de toque não gastam PixelLab, não mexem na física e podem ser ocultados sem deixar ações presas quando a cena é removida. Verifique em navegador móvel o tamanho dos alvos e o comportamento em múltiplos dedos.

Na exportação Web, `pointing/emulate_touch_from_mouse=true` permite testar os botões com clique de mouse no desktop. Abaixo de 667px do HUD, a seta ↓ foi posicionada sem cobrir a faixa inferior de instruções.
