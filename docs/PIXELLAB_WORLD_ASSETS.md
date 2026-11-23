# Produção visual pelo PixelLab — cenários e monstros

Este fluxo é exclusivo do **PixelLab API v2**. Não utiliza imagens geradas no chat, nem copia assets de jogos comerciais. A direção é fantasia anime mágica autoral, com silhuetas legíveis no jogo 2D.

## Cenários candidatos

Action manual: [PixelLab — cenários originais para revisão](https://github.com/HelioConde/Re-Dream/actions/workflows/pixellab-world-scenes.yml).

| World | Imagem | Arte solicitada |
| --- | --- | --- |
| `crystal_forest` | `assets/pixellab/world_candidates/crystal_forest/background.png` | Floresta de Cristal diurna, ruínas, cascatas e cristais |
| `lunar_ruins` | `assets/pixellab/world_candidates/lunar_ruins/background.png` | Vale de ruínas lunares, cachoeiras, arco místico e névoa |

Cada imagem é gerada **uma vez por execução**, com `POST /create-image-pixen`, resolução nativa **512×288**, cenário opaco, prompt versionado e manifesto SHA-256. Os arquivos ficam em `world_candidates`: **não são automaticamente usados pela Godot** e não mudam física nem colisões. O terreno e os objetos precisam ser montados em camadas antes de aprovar parallax e gameplay. Não esticar pixels com filtragem linear.

## Monstros

Action manual existente: [PixelLab — gerar sprites e criar PR](https://github.com/HelioConde/Re-Dream/actions/workflows/pixellab-sprites.yml).

| Target | Identidade | Conjuntos |
| --- | --- | --- |
| `crystal_imp` | Guardião de Musgo com chifres de cristal, orelhas de folhas e cajado | `core`: idle/run/attack; `full`: + hit |
| `root_goblin` | Goblin de raízes, couro de árvore, orelhas verdes, clava com cristal único | `core`: idle/run/attack; `full`: + hit |
| `lunar_moth` | Mariposa lunar lilás com quatro asas e cristais | `core`: idle/run/attack; `full`: + hit |

Cada criatura usa **um único PNG mestre transparente 96×96**, criado pelo PixelLab, e gera seus movimentos a partir desse mestre. Os novos monstros ainda são **candidatos**, não novas entidades com IA aprovada. O inimigo atual conserva o desenho procedural e `enemy` como fallback até que os frames do `crystal_imp` sejam realmente inspecionados.

## Execução segura

1. Abrir a Action específica, selecionar o mundo ou monstro e executar com **`generate=false`** para validar o plano gratuitamente.
2. Após conferir o prompt, executar novamente com **`generate=true`**, usando apenas `PIXELLAB_API_KEY` armazenada nos segredos do repositório. Essa chamada usa créditos reais.
3. Guardar artefato, manifesto e hashes; a Action tenta abrir **PR de arte em rascunho** isolada. Não substituir automaticamente PNGs previamente aprovados.
4. Abrir cada frame e conferir: identidade visual, proporções, transparência, bordas, direção voltada à direita, legibilidade em 96 px, consistência no idle/run/attack, naturalidade dos movimentos.
5. Para backgrounds, conferir faixa de leitura de personagens, composição, contraste e separação real de céu, ruínas, árvores, cachoeira e terreno em parallax. Implementar e validar colisão, Godot headless, smoke tests, export Web e browser QA **em PR posterior**.
6. Somente depois dessa aprovação integrar o pacote à `main`. Não modificar `GameTeste`, segredos ou configuração de produção.

**Limite contra cobrança duplicada:** o gerador de cenários recusa sobrescrever imagem existente sem o manifesto correto e verifica SHA-256 antes de retornar. Se uma geração falhar depois de consumir créditos e antes do commit, recupere o artefato/checkpoint e não reinicie às cegas.

API: https://api.pixellab.ai/v2/docs
