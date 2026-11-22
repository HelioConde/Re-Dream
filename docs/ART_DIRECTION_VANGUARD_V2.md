# Eclipse Vanguard — Bíblia visual V2: fantasia mágica e aventura

**Feedback do criador, 22/11/2026:** o protagonista atual parece um guerreiro militar genérico. O jogo precisa representar um **mundo mágico de aventura**: silhuetas expressivas, cores alegres, magia, exploração e cenários variados.

## Identidade própria

- **Gênero:** RPG de ação e plataformas laterais, fantasia anime colorida, personagens carismáticos e mobilidade.
- **Evitar:** paleta quase toda preta, armadura medieval pesada, bonecos anônimos, cenários escuros sem contraste, copiar personagens ou trajes de Grand Chase.
- **Personagem original:** **Aren — Explorador da Lua**. Cabelo castanho esvoaçante; olhos azul-turquesa expressivos; amuleto de pedra da lua; casaco branco-marfil e azul vivo; cachecol turquesa; botas de viagem e sabre com núcleo de cristal luminoso. Jovem aventureiro adulto, alegre e ousado, não soldado.
- **Estilo:** pixel art de aventura anime desenhada para **128×128**, cabeça ~1/4,5 da altura, leitura legível no gameplay. Rosto e pose reconhecíveis na escala da tela. 2D lateral olhando para a direita, fundo RGBA transparente; Godot espelha horizontalmente.
- **Paleta:** `#244C95` azul cobalto, `#38C8CE` turquesa, `#F2E9D9` marfim, `#FFC36E` ouro, `#FF869A` rosa/coral, `#9DEDF3` brilho lunar. Sombras profundas só nos contrastes.
- **Cenário inicial:** **Floresta de Cristal** com árvores de copa volumosa, colinas distantes, cachoeira e ruínas de magia, grama esmeralda, cristais luminosos, borboletas/vagalumes, plataformas naturais.
- **Inimigos:** seres fantásticos legíveis (goblins de raízes, mariposas lunares, guardiões de cristal), não apenas guerreiros armados. Arte autoral.

## Contrato PixelLab V2

1. Gerar **um único sprite-mestre** (`vanguard/idle/000.png`) com `create-image-pixen` de 128×128 e prompt em `tools/generate_pixellab.py`.
2. Derivar as animações do mesmo mestre com `animate-with-text-v3`: corrida, ataque, salto, dash, dano, golpe pesado e magia. Sem recomeçar a identidade a cada quadro.
3. Manter o PNG mestre, frames e `manifest.json` com hashes SHA-256, ID de job, prompt e créditos quando informados.
4. Revisar em captura real: rosto, proporções, orientação, posição dos pés, espada e amuleto consistentes em todos os quadros; ausência de bordas sujas.
5. Apenas integrar PR de sprites ao `main` quando houver **idle + run + attack** coerentes. O Godot busca `vanguard` e só ativa quando esse núcleo estiver completo; até lá preserva `hero`, o PixelLab anterior.
6. **Não gerar automaticamente**: a Action manual inicia com `generate=false`. `generate=true` usa créditos PixelLab e segredo `PIXELLAB_API_KEY` do repositório Re-Dream.

## Marco entregue — 22/11/2026

O [PixelLab run #45029569284](https://github.com/HelioConde/Re-Dream/actions/runs/45029569284) gerou um mestre 128×128 e 9 quadros de corrida mais 9 de ataque, com manifesto e hashes. O conjunto foi inspecionado em amostras (rosto, paleta, silhueta e espada preservados) e integrado à `main` pela [PR #35](https://github.com/HelioConde/Re-Dream/pull/35), após testes Python/Godot e export Web. O antigo `hero` continua como fallback. A corrida ainda merece avaliação de passada e fluidez em velocidade real; os estados avançados não têm PNG próprio. Uma Action aprovada não substitui QA manual de navegador e ritmo das animações.

## Inimigo mágico da Floresta de Cristal (implementado como fallback)

**Crystal Imp — Guardião de Musgo**: criatura pequena e original, de raízes flexíveis, orelhas de folhas, olhos grandes expressivos, chifres de cristal turquesa, pedra da lua brilhante no peito e bastão mágico. Paleta esmeralda/ciano e versão elite violeta. O desenho procedural no Godot substitui o guerreiro de armadura enquanto o conjunto PixelLab V2 não estiver pronto. As colisões, dano e IA não são alterados.

O gerador PixelLab já reconhece o alvo `crystal_imp` (idle/run/attack/hit) de 96×96. Depois de gerar, o Godot prefere `crystal_imp` apenas quando existem idle, run e attack; senão usa `enemy` e desenho procedural original. Mantenha a aparência do monstrinho idêntica em todos os quadros.
