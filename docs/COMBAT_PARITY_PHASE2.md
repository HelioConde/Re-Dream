# Eclipse Vanguard Godot — Combate herdado do Re:Dream, etapa 2

## Mecânicas implementadas
- **J no chão:** combo de três golpes com janela de continuidade. Nada altera a IA ou a colisão.
- **↑ + J:** launcher no solo, golpe ascendente com impulso vertical no inimigo, sem salto involuntário (modificador tecla W/↑).
- **J no ar:** ataque aéreo com maior alcance vertical para acertar inimigos abaixo.
- **J durante dash:** cancela o deslocamento do dash e executa golpe próprio.
- **Z:** ao pressionar inicia um ataque básico; enquanto segura carrega a magia em barras de 0,65 s. Ao soltar: MP1 aos 0,65s, MP2 aos 1,30s, MP3 aos 1,95s. A magia falha sem mana suficiente ou durante cooldown, sem gastar recurso.
- **L:** preserva o especial de nível 1 que existia no Godot.
- **Feedback:** indicador de carga no HUD, raio de magia diferente por tier e uso de animações PixelLab quando disponíveis; estados sem PNG usam fallback, sem regeneração.

## Custos e efeitos iniciais (balanceamento provisório)
| Magia | Segurar Z | Energia | Alcance | Tempo de espera |
| --- | --- | --- | --- | --- |
| MP1 | 0,65s | 35 | 195 px | 6,0s |
| MP2 | 1,30s | 50 | 255 px | 6,75s |
| MP3 | 1,95s | 70 | 325 px | 7,5s |

## Comparação com o jogo original
O treino Phaser antigo usava 100 MP por barra, 300 MP de capacidade e mais ações avançadas, incluindo Otto, Rocket/Shadow, juggle e air chase. Esta fase usa os valores de energia atuais do Godot (0–100) e **não afirma fidelidade exata ao sistema anterior**. A próxima fase deve testar balanceamento, cancelar movimentos e colisões no jogo real.

## QA reproduzível
```sh
godot --headless --editor --path . --quit
godot --headless --path . --script res://tests/smoke_test.gd
```
`tests/smoke_test.gd` verifica dano/impulso do launcher, alcance vertical do aéreo, cancelamento do dash, MP2 via Z, consumo de mana, limpeza do estado da carga e impedimento de MP3 sem recursos. Os sprites existentes não são removidos; novos PNGs podem complementar as animações.
