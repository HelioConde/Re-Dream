# Re:Dream Phaser → Eclipse Vanguard Godot: mapa de paridade

**Destino:** `HelioConde/Re-Dream` (branch principal). **Backup:** `archive/redream-phaser-before-godot-20261122`. **Base Godot/PixelLab:** `HelioConde/GameTeste` no commit `9988400dcd45ed49ad1cbf2047879879a2ca5530`.

| Sistema anterior do Re:Dream | Estado inicial no Godot | Pendente |
| --- | --- | --- |
| Correr, andar e pular | Implementado com `CharacterBody2D` | QA de resposta |
| Dash duplo toque → corrida | Dash por Shift; paridade pendente | Duplo toque e cancelar corrida |
| J/Z golpes e 4 combos | Combo de 3 golpes por J | Combos extras/cancel |
| Heavy, especial | Golpe pesado e habilidade de área | MP1/2/3 carregados |
| Rocket, Shadow, Otto, launcher, juggle | Não portado | FSM aérea |
| ↓ atravessar plataforma | Colisores one-way, tecla ↓ pendente | Input e teste |
| Cenários desenhados e animações SVG | Não importados para o motor novo | Novos sprites e backgrounds PixelLab |
| 19 PNGs PixelLab do GameTeste | Importados e consumidos pelo Godot | Mais estados e inimigos |
| Missões com ondas e chefão | Ondas e elite disponíveis | Chefão com fases |
| Salas multiplayer WebSocket | Não portadas | Arquitetura Godot/netcode |
| Interface, HUD e inventário | HUD básica, sem inventário | Menus e inventário |
| Publicação GitHub Pages | Configurada como export Godot Web | QA desktop/mobile |

## Decisões
- A branch de arquivo preserva arquivos e histórico do cliente Phaser.
- Não reiniciar a geração PixelLab já concluída: reutilizar os mesmos PNGs e manifesto sem API.
- Prioridade: gameplay Godot offline com testes > consistência visual > fases > multiplayer.
- Não reproduzir arte/marca/código de Grand Chase ou outros jogos.
- Testes GitHub Actions demonstram importação/execução/build, não a qualidade visual final.
