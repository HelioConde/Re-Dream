# Eclipse Vanguard — instruções para agentes

Este repositório é a evolução do antigo Re:Dream em **Eclipse Vanguard**. O cliente mantém React, TypeScript, Phaser 4 e Vite; o servidor de partidas usa Node.js + WebSocket. **Não migrar a engine para Godot neste repositório sem tarefa explícita.** O protótipo original de Eclipse Vanguard em `HelioConde/GameTeste` permanece separado e é usado como origem de sprites PixelLab autorais.

## Ler antes de programar
1. `docs/ECLIPSE_VANGUARD.md` — escopo, arte e sequência da migração.
2. `docs/GDD_RE_DREAM.md` — especificação histórica, mecânicas existentes.
3. `docs/AI_GAME_STUDIO.md` e `.claude/skills/` — nove skills locais.
4. `docs/BACKLOG_RE_DREAM.md` — backlog anterior; não tratar propostas como implementadas.

## Limites obrigatórios
- Editar **somente este repositório**. GameTeste é uma fonte pública de leitura para importar arte original já gerada.
- Não copiar arte, áudio, código, marcas, personagens ou mapas de Grand Chase ou outras franquias.
- Tratar PixelLab como **assets originais**. Usar hash SHA-256, origem, manifesto, versões e revisão humana das animações geradas; nunca divulgar tokens.
- Manter fallback SVG para estados sem PNG; não apagar as 23 animações do Aren nem alterar hitbox e física durante trabalho puramente visual.
- Preservar duplo toque → dash, segurar segundo toque → corrida, Rocket/Shadow Step, Otto, launcher, juggle e descida por ↓ no treino.
- **Somente no treino offline**, segurar/soltar Z carrega MP1/MP2/MP3; não transformar A/S/D em magia. O multiplayer tem simulação diferente e exige testes de rede.
- Não assumir GitHub Pages hospeda servidor WebSocket. `VITE_WS_URL` aponta a servidor externo.
- Não considerar build sem erros uma validação visual. Conferir em navegador desktop/celular e registrar diferenças de proporção/física.
- Após alteração TypeScript, rodar `npm test`, `npm run build`; em mudança gráfica, QA com imagem real. Não inventar métricas.

## Ordem sugerida
Validar CI → importar PixelLab com hashes → verificar movimento e animações visuais → corrigir descontinuidades de estilo → gerar novos estados PixelLab de forma incremental → ampliar fases e conteúdos sem quebrar o gameplay.

As skills são procedimentos de desenvolvimento, não runtime do jogo.
