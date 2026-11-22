# Eclipse Vanguard — migração de Re:Dream e PixelLab

**Início:** 22/11/2026. **Escopo:** `HelioConde/Re-Dream`, evolução do projeto Phaser existente. O repositório `HelioConde/GameTeste` é outro protótipo (Godot 4.7.2) com o mesmo título, não deve ser sobrescrito nesta migração.

## Objetivo
Criar um RPG de ação e plataformas com identidade original **Eclipse Vanguard**: heróis contra uma ameaça lunar, combates ágeis, golpes encadeados, plataformas, áreas a explorar e cooperação. O cenário inicial permanece um bosque noturno com plataformas; renomear a missão não altera imediatamente a geometria. Evitar confundir mudanças de texto com novos níveis jogáveis.

## Entregue nesta etapa
1. Identidade de Eclipse Vanguard aplicada à tela de entrada, portal, seleção, treino, HUD, título e tema escuro/violeta. Caminho público continua `/Re-Dream/` para manter links.
2. Combate, física, servidores, 23 estados SVG e cenário original preservados. **Não** portar o código Godot; aproveitar a base Phaser existente, mais madura no multiplayer.
3. Importação reproduzível do conjunto PixelLab já gerado pelo mesmo criador no GameTeste, com origem fixada:
   - Repositório: `HelioConde/GameTeste`.
   - Commit de origem: `9988400dcd45ed49ad1cbf2047879879a2ca5530`.
   - PNGs: `assets/pixellab/hero/idle/000.png` e `run`/`attack` 000–008.
   - Metadados: `assets/pixellab/hero/manifest.json`, com SHA-256 por quadro e jobs de PixelLab.
   - Importador: `scripts/import_eclipse_pixellab.py --apply`; valida PNG e SHA-256 antes de gravar.
   - Destino: `apps/web/src/assets/pixellab/hero/`.
4. O cliente pré-carrega texturas PixelLab válidas, usa idle, corrida e ataque quando presentes, e segue usando o SVG correspondente nas outras ações. Nenhuma colisão, frame de dano ou autoridade do servidor é alterada.

## Próxima fila visual
- **EV-ART-01**: capturar screenshot no GitHub Pages desktop e mobile; conferir proporção do sprite PixelLab ao lado das plataformas e inimigos.
- **EV-ART-02**: gerar animações PixelLab originais para salto, dash, hit, combo forte e MP1–MP3; revisar consistência do mesmo personagem antes de substituir fallback.
- **EV-ART-03**: produzir adversários, chefes e cenário por camadas com PixelLab, mantendo cenário/parallax e hitboxes testados. Não misturar estilos incompatíveis.
- **EV-GAME-01**: expandir missão do Bosque do Eclipse, com objetivos e telas reais, sem afirmar conteúdo ainda não implementado.
- **EV-NET-01**: avaliar a paridade entre as regras offline e multiplayer, com testes autoritativos antes de alterar o servidor.

## QA e limitações
- `npm test`, `npm run build`, testes de física/combate e CI.
- Vite só inclui PNGs que existem no momento da compilação; o workflow de Pages importa os 19 arquivos **antes** de compilar.
- O importador reutiliza arte já gerada e **não faz chamadas pagas** ao PixelLab. Geração nova via API exige credenciais/créditos, workflow explícito e revisão.
- Não houve autorização para copiar sprites de Grand Chase nem para apagar a arte anterior; todo conteúdo é original ou referenciado com licença auditada.
- Mudanças visuais precisam de screenshot real; teste unitário não comprova estética.
