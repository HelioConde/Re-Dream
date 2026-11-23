# QA visual — Aren V2 e Crystal Imp

Este roteiro valida o combate e a direção de arte mágica sem consumir créditos PixelLab. Execute na exportação Web de uma branch de revisão e compare com a `main` antes de integrar alterações visuais.

## Preparação

1. Rodar `godot --headless --editor --path . --quit`.
2. Rodar `godot --headless --path . --script res://tests/smoke_test.gd`.
3. Rodar `python -m unittest discover -s tests -p 'test_pixellab*.py' -v`.
4. Validar a exportação Web pelo workflow e abrir a build em navegador desktop e mobile.

## Sequências manuais obrigatórias

| Ação | Resultado esperado | Falha bloqueante |
| --- | --- | --- |
| Parado, corrida e quatro golpes com J/Z | Aren mantém cabelo, cachecol, espada, amuleto e proporções V2; combo sem saltar quadros | Troca de identidade ou quadros cortados |
| Saltar com ↑/W, cair e pousar | Sprite de salto aprovado, sem flash de pose nem travar em queda | Sprite invisível ou preso |
| Dash com Shift ou duplo toque, atacar durante dash | Transição legível, ataque cancela dash e não perde controle | Dash infinito ou ataque invisível |
| Carregar Z até MP1, MP2 e MP3 | Brilho acompanha carga, consumo de mana correto | Magia indevida ou estado visual persistente |
| Sofrer dano durante ataque e brilho de skill | Reação de hit tem prioridade, golpe pendente interrompe e depois volta a idle | Ataque continua ou brilho fica preso |
| Atacar Crystal Imp e aguardar 0,15 s | Realce arcano breve, sprite retorna à cor normal | Inimigo permanentemente tingido |
| Usar launcher, ataque aéreo e mergulho | Inimigo reage sem juggle infinito; plataformas atravessáveis mantêm regras | Colisão quebrada ou stun infinito |
| Repetir J/Z e setas no mobile | Seis botões sem sobreposição; comandos simultâneos funcionam | Botão inacessível ou entrada perdida |

## Aprovação

Registrar para cada cenário: build/commit, navegador, dispositivo, resultado e screenshot ou vídeo curto. Não aprovar novos sprites PixelLab sem checar transparência, dimensões, hashes e consistência com o Character persistente. Se faltar animação aprovada, manter o fallback atual. Não realizar merge só porque o CI ficou verde.

Referências: `AGENTS.md`, `docs/ROADMAP.md`, `docs/ART_DIRECTION_VANGUARD_V2.md` e `docs/PIXELLAB_CHARACTER_WORKFLOW.md`.
