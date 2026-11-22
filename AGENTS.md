# Eclipse Vanguard — instruções para agentes

O jogo do repositório `Re-Dream` agora é **Eclipse Vanguard em Godot 4.7.2**. A versão Phaser/React/WebSocket anterior está guardada em `archive/redream-phaser-before-godot-20261122`. `HelioConde/GameTeste` é a fonte histórica Godot/PixelLab, não a branch principal deste jogo.

## Ler antes de editar
1. `README.md`
2. `docs/RE_DREAM_MIGRATION.md`
3. `docs/ROADMAP.md`
4. `assets/pixellab/README.md`

## Regras
- Usar **Godot GDScript** no projeto principal; não recolocar Phaser/React no runtime.
- Nunca modificar GameTeste sem solicitação específica.
- Não copiar marcas, sons, sprites, personagens ou código de jogos protegidos; produzir arte autoral via PixelLab.
- Manter os PNGs PixelLab existentes, com manifesto e hashes; arte nova requer revisão de fidelidade, transparência e pose.
- Não declarar como migrados o multiplayer Phaser, os 23 estados SVG do Aren ou suas técnicas avançadas enquanto não estiverem implementadas no Godot.
- Após editar scripts, rodar importação headless + smoke test. Para imagens, rodar testes PNG e export Web.
- Não consumir créditos PixelLab sem workflow manual e `generate=true` explícito.
- GitHub Pages hospeda o jogo WebAssembly em `/Re-Dream/`, mas não um servidor multiplayer.

## Próximos marcos
Portar controles avançados do Re:Dream → melhorar sprites e animações → finalizar cenários e chefes → avaliar cooperativo com arquitetura de Godot.

## Direção de arte obrigatória

Ler `docs/ART_DIRECTION_VANGUARD_V2.md`. O herói precisa ter aparência de aventureiro anime mágico, não cavaleiro militar. Gerar o novo `vanguard` via PixelLab a partir de sprite-mestre, preservar `hero` como fallback e **não** aprovar sem verificar idle, run, attack e continuidade visual. Não usar diretamente sprites ou traços idênticos de franquias externas.
