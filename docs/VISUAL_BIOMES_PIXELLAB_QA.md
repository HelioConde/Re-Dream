# Eclipse Vanguard — contrato de cenários e monstros PixelLab (candidatos)

Este documento define a próxima entrega visual, **sem ativar assets não revisados**. Referências: `AGENTS.md`, `docs/ART_DIRECTION_VANGUARD_V2.md` e `docs/ROADMAP.md`.

## Floresta de Cristal — primeiro bioma

Produzir arte **original** em pixel art anime de fantasia, com turquesa lunar, verdes esmeralda e ruínas claras. Não copiar sprites de Grand Chase. Separar o cenário em camadas, em vez de usar uma única imagem com plataformas desenhadas (a arte não pode definir a colisão):

1. `sky`: céu, nuvens e brilho distante; fundo opaco, sem detalhes de alto contraste na região do personagem.
2. `far`: montanhas e cachoeiras distantes; PNG RGBA com transparência.
3. `mid`: árvores, arcos de pedra e cristais ao fundo; PNG RGBA com transparência.
4. `foreground`: raízes, folhas e pedras decorativas; PNG RGBA com transparência, sem cobrir Aren ou os inimigos.
5. `terrain`: tiles separados de solo, borda de grama, penhasco e plataformas; colisões e posições continuam definidas pelas cenas Godot.

**Parallax proposto (sujeito a QA):** sky 0, far 0.15, mid 0.45, foreground 1.10. Nenhuma camada visual deve alterar o tamanho da arena (3200×720), a câmera ou as cinco plataformas one-way existentes nesta primeira entrega.

## Inimigos — mesma família visual

- **Crystal Imp:** priorizar o inimigo já implementado. Referência única: chifres de cristal ciano, orelhas de folha, corpo de raízes, amuleto lunar e bastão. Sprite-mestre **96×96**, olhando à direita; estados `idle`, `run`, `attack` e `hit` derivados do mesmo Character; variação elite violeta só após o conjunto básico.
- **Goblin de Raízes:** candidato futuro com clava de madeira/cristal e silhueta mais larga; não substituir a IA ou colisão de Crystal Imp por enquanto.
- **Mariposa Lunar:** candidato futuro de inimigo voador, asas violetas e cristais turquesa; não introduzir voo sem testes próprios de colisão e ataque.

## Gate de qualidade e integração

- Usar PixelLab real com registro de job, prompt, `character_id` quando aplicável, SHA-256 e manifesto; **não rotular arte feita por outro gerador como PixelLab**.
- Gerar somente via workflow manual com `generate=true` explicitamente autorizado; não executar geração paga neste PR.
- Conferir transparência real (alpha), pixels isolados, silhueta a 1× e escala de jogo, consistência de tamanho/pivô e ausência de cortes.
- Exigir `idle + run + attack` consistentes antes de ativar Crystal Imp; manter desenho procedural/PNG anterior como fallback se faltar qualquer quadro.
- Para cenário, testar separadamente o fundo, as camadas e a legibilidade de Aren/inimigos durante combo, dash e salto; não aceitar plataformas meramente pintadas sem colisão correspondente.
- Rodar `godot --headless --editor --path . --quit`, `godot --headless --path . --script res://tests/smoke_test.gd`, testes `test_pixellab*.py` e export Web; verificar visualmente no Pages antes do merge.

**Fora do escopo:** alteração de `GameTeste`, segredos, multiplayer, gameplay, substituição do Aren V2 e publicação automática de candidatos.
