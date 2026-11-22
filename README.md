# Eclipse Vanguard — Godot 4

**Eclipse Vanguard** é um RPG original de ação/plataformas 2D desenvolvido com **Godot 4.7.2 e GDScript**. Esta é a **conversão do repositório Re-Dream para Godot**. A base inicial foi migrada de [HelioConde/GameTeste](https://github.com/HelioConde/GameTeste) para este mesmo repositório.

🎮 [Jogar na Web](https://helioconde.github.io/Re-Dream/) · 📂 [Repositório](https://github.com/HelioConde/Re-Dream)

## Histórico preservado

O jogo original **Re:Dream** em Phaser/React/TypeScript/WebSocket está arquivado na branch [archive/redream-phaser-before-godot-20261122](https://github.com/HelioConde/Re-Dream/tree/archive/redream-phaser-before-godot-20261122). Nenhuma migração pode afirmar que o multiplayer anterior e todos os controles originais já foram portados; consulte a [matriz de paridade](docs/RE_DREAM_MIGRATION.md).

## Funcionalidades da primeira versão Godot

- Arena 2D horizontal de 3.200 pixels com cinco plataformas atravessáveis por baixo.
- Herói: movimentação lateral, salto, combo de três golpes, golpe forte, dash e especial.
- Inimigos com IA de perseguição, ataques sinalizados, ondas de adversários e elites.
- Vida, energia, EXP, níveis e HUD.
- **19 quadros PNG PixelLab originais** importados: 1 parado, 9 corrida e 9 ataque. Assets ausentes usam desenho procedural.
- Publicação em GitHub Pages a partir de uma **exportação Web Godot**, sem Phaser.
- Testes automatizados de cena, dano, controles e integridade PixelLab.

## Controles

| Tecla | Ação |
| --- | --- |
| A / D ou ← / → | Mover; duplo toque faz dash, segurar mantém corrida |
| ↑ / W | Pular; durante dash ativa Rocket Step |
| ↓ / S | Descer de plataforma vazada; durante Rocket no ar ativa Shadow Step |
| ↓ + Espaço | Descida alternativa imediata de plataforma vazada |
| J / Z | Ataque do Re:Dream; ↑+J/Z lança, J/Z no ar dá ataque aéreo e durante dash golpe rápido |
| H | Ataque forte adicional do protótipo Godot |
| Shift | Dash |
| K / X / L | Especial direto (teclas do modo online antigo e opção Godot) |
| Z (toque ou segure e solte) | Golpe inicial; carregar por 0,65s/1,30s/1,95s e soltar invoca MP1/MP2/MP3 |
| R / Enter | Reiniciar após derrota |

## Desenvolvimento

Instale **Godot 4.7.2** (versão padrão, sem .NET), importe `project.godot` e pressione **F5**.

```sh
git clone https://github.com/HelioConde/Re-Dream.git
cd Re-Dream
godot --headless --editor --path . --quit
godot --headless --path . --script res://tests/smoke_test.gd
python -m unittest discover -s tests -p 'test_pixellab*.py' -v
```

Para uso local de testes PixelLab, instale `Pillow>=11,<13`. As Actions executam automaticamente as verificações.

## PixelLab

Os 19 sprites de `assets/pixellab/hero/` foram produzidos pela API PixelLab no mesmo projeto autoral, antes desta conversão. Os arquivos e seu `manifest.json` foram transferidos do commit `9988400dcd45ed49ad1cbf2047879879a2ca5530` de `GameTeste`, com bytes preservados. Não consome créditos para reutilizar sprites.

Para criar mais sprites, o projeto possui a Action **PixelLab — gerar sprites e criar PR**, com geração **desabilitada por padrão**. Geração real só ocorre após configurar `PIXELLAB_API_KEY` como segredo e escolher `generate=true` manualmente (consome créditos). Veja [guia de sprites](assets/pixellab/README.md).

## Código

`project.godot` define a engine e a cena inicial `scenes/Main.tscn`. Em `scripts/` ficam os scripts GDScript de arena, herói, IA e animações PNG. `tests/` tem testes de jogo e sprites. `.github/workflows/deploy-pages.yml` exporta WebAssembly para [o site do Re-Dream](https://helioconde.github.io/Re-Dream/), agora com Eclipse Vanguard.

Esta é uma **conversão inicial jogável**, não uma migração completa e já validada de todas as mecânicas, modos e 23 estados gráficos anteriores. O multiplayer ainda não existe nesta versão Godot.

**Identidade autoral:** sem copiar personagens, músicas, sprites, marcas ou código de outros jogos.

## Redesign da direção de arte

A estética anterior de guerreiro sombrio foi considerada inadequada para o mundo mágico de aventura. O protagonista **Aren, Explorador da Lua**, ganhará uma versão PixelLab original mais expressiva, colorida e com elementos mágicos, acompanhada de cenário mais vibrante. A Action manual já tem alvo `vanguard` com sprite-mestre 128×128 e animações derivadas dele. **O novo PNG ainda precisa ser gerado e revisado antes de substituir o personagem atual.** Confira a [Bíblia visual V2](docs/ART_DIRECTION_VANGUARD_V2.md).

## Combate aéreo (Godot)

- **↓+Z ou ↓+J no ar:** estocada/mergulho mágico, atravessa temporariamente plataformas vazadas; o chão sólido continua bloqueando.
- **↓+Z ou ↓+J junto à borda de plataforma vazada:** Otto de borda, golpe descendente que usa a mesma passagem de plataforma do comando ↓.
- **Acerto aéreo após launcher:** mantém inimigos suspensos por até três levantamentos, depois os acertos continuam causando dano mas não permitem juggle infinito.

Os ataques usam a mesma arte PixelLab com fallback até serem aprovadas animações específicas. A sensação do combate precisa de avaliação manual além dos smoke tests.
