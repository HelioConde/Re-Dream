# Eclipse Vanguard

**Eclipse Vanguard** é um jogo independente de ação, combate e plataformas 2D, desenvolvido no navegador com **Phaser 4, React, TypeScript e WebSocket**. Este repositório evolui o antigo Re:Dream, preservando o combate existente e adotando a identidade de Eclipse Vanguard.

🎮 **[Jogar a pré-alfa no GitHub Pages](https://helioconde.github.io/Re-Dream/)**

> O endereço continua `/Re-Dream/` para não quebrar os links publicados. O título do jogo dentro do site é Eclipse Vanguard. A edição Godot independente permanece em `HelioConde/GameTeste`.

## O que está jogável

- Treino offline com controle lateral, plataformas vazadas, dash, corrida, salto, Rocket/Shadow Step, Otto, combos, launcher, juggle e habilidades com energia.
- Salas WebSocket cooperativas de até quatro jogadores, com ondas e chefe de demonstração; o servidor exige hospedagem separada do GitHub Pages.
- Aren, espadachim original, é o protagonista selecionável. O pipeline de arte suporta PNGs PixelLab sem destruir as 23 ações SVG que servem de fallback.
- Visual do portal em tema lunar/eclipse, navegação, seleção de personagem, mapa de missões e HUD.

**Estado:** pré-alfa. Novos cenários, inimigos, sistemas de progressão e arte final ainda estão em desenvolvimento. Não há persistência de inventário nem backend embutido no GitHub Pages.

## PixelLab: sprites reais na versão web

A integração inicial importa **19 PNGs originais** (idle: 1, run: 9, attack: 9) gerados anteriormente pelo PixelLab para o protótipo Eclipse Vanguard. O importador usa um commit fixo de `HelioConde/GameTeste`, valida SHA-256 de cada arquivo contra o manifesto de geração e copia os PNGs para `apps/web/src/assets/pixellab/hero/`.

O CI executa:

```sh
python scripts/import_eclipse_pixellab.py --apply
npm install
npm test
npm run build
```

Durante o build, Vite inclui os PNGs presentes; Phaser os usa nos estados de repouso, corrida e ataques básicos. A seleção e o HUD também mostram o herói PixelLab. Caso não exista um estado importado, **a animação vetorial original é mantida**. A importação por CI não substitui nem apaga arte antiga.

Para inspecionar a origem e os hashes, consulte [o guia da migração](docs/ECLIPSE_VANGUARD.md). Não são necessárias credenciais PixelLab para **reutilizar** os sprites já gerados. Para **gerar novos** sprites diretamente pela API, é preciso uma chave PixelLab válida e créditos de geração; a execução deve ser deliberada e revisada.

## Executar localmente

Requer Node.js 22+ e npm:

```sh
npm install
python scripts/import_eclipse_pixellab.py --apply   # precisa da rede, não consome créditos
npm run dev
```

O app roda em `http://localhost:5173`, o servidor em `ws://localhost:3001/ws`. Para checar:

```sh
npm test
npm run build
```

O treino funciona sem servidor. Salas online dependem de `VITE_WS_URL` configurado para um servidor WebSocket público com `wss://`. GitHub Pages hospeda somente o frontend.

## Controles

| Tecla | Ação |
| --- | --- |
| A / D, ← / → | Andar; duplo toque inicia dash, segurar mantém corrida |
| W, ↑ ou Espaço | Pular |
| ↓ | Atravessar plataformas vazadas no treino |
| J / Z | Ataque básico (conforme o modo) |
| Segurar e soltar Z | MP1/MP2/MP3 no treino offline |
| K / X | Habilidade no multiplayer |
| Touch | Controles adaptados para celulares |

**Observação:** o treino offline e as salas online possuem diferenças de comandos e regras; elas não foram unificadas por esta migração.

## Estrutura

- `apps/web/`: jogo Phaser e interface React.
- `apps/server/`: salas online e simulação autoritativa.
- `apps/web/src/eclipsePixellab.ts`: catálogo e seleção das animações PixelLab.
- `scripts/import_eclipse_pixellab.py`: importação reprodutível e verificação SHA-256.
- `docs/ECLIPSE_VANGUARD.md`: especificação e roadmap da migração.
- `docs/`: documentos históricos e skills de desenvolvimento do Re:Dream.
- `.github/workflows/pages.yml`: testes e publicação.

O projeto é **autoral**. Inspirar-se na sensação de jogos de ação/plataforma não permite copiar marcas, sprites, áudio, personagens, mapas ou código protegidos de outras franquias.

Criado por [Hélio Conde](https://github.com/HelioConde).
