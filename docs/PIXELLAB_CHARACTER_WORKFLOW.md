# Aren como Character persistente no PixelLab

O sprite do Aren V2, aprovado na PR #35, é **o mestre visual original** e não deve ser regenerado. O objetivo deste pipeline é registrar um **Character persistente na biblioteca PixelLab** e gerar animações com um mesmo `character_id`, em vez de inventar roupas e rosto a cada pose.

## Decisão de API

Conforme a API oficial PixelLab v2:

- `create-character-v3` exige referência olhando **sul**. Nosso Aren foi desenhado olhando **leste**.
- `create-character-pro` com `method=rotate_character`, `view=side`, `reference_image` com o PNG existente e template `mannequin` preserva a origem do design e constrói o personagem com rotações.
- `animate-character` com `mode=v3`, `directions=["east"]`, `custom_start_frame` do mestre e `animation_name` por movimento cria animações ligadas ao mesmo registro do personagem.
- `GET /characters/{character_id}/zip` exporta quadros para Godot, com PNGs e metadados de pivô/esqueleto.

## Produção inicial isolada

O workflow `.github/workflows/pixellab-character-aren-once.yml` dispara uma única vez quando esse próprio arquivo é criado na branch `feat/pixellab-managed-character-aren-20261122`. Primeiro executa testes sem créditos; só então usa `PIXELLAB_API_KEY` para criar o Character persistente e gerar **jump**, **dash** e **hit**.

A geração salva `assets/pixellab/vanguard_character_candidate/character.json` com `character_id`, hash SHA-256 do mestre, jobs e hashes PNG. Esse checkpoint é exportado até se a geração falhar, e os PNGs ficam numa branch de revisão. A geração não troca `assets/pixellab/vanguard`, não altera o personagem jogável e não modifica `GameTeste`.

**Atenção:** o Character Pro usa créditos PixelLab. O usuário autorizou o uso do PixelLab, mas não usar repetições automáticas de falhas que cobrariam a mesma criação de novo. Recuperar o ID do checkpoint e reiniciar a partir dele.

## QA antes da integração

Comparar `idle` aprovado com o novo `rotations/east` no mesmo tamanho. Conferir cabelo, cachecol, rosto, punho da espada, amuleto, pés e transparência. Depois inspecionar todos os quadros de jump/dash/hit para borrões, duplicatas, deslocamento do pivô e ritmo da animação. Se a nova arte não bater com o Aren aprovado, não a integrar. Ajustar ou refazer somente o movimento reprovado. O jogo permanece com fallback anterior.

Para integrar um movimento aprovado, copiar frames candidatos para `assets/pixellab/vanguard/<movimento>/`, com hashes e manifestos correspondentes. O `AnimatedSprite2D` do Godot precisa ser validado contra o canvas de cada animação, que pode exceder 128 px para movimentos largos.

Referência: [PixelLab API oficial](https://api.pixellab.ai/v2/docs).

## Primeira integração seletiva

O Character persistente criado no [run #45032951179](https://github.com/HelioConde/Re-Dream/actions/runs/45032951179) gerou 27 quadros (jump, dash, hit) associados ao ID salvo em `assets/pixellab/vanguard_character_candidate/character.json`. Após inspeção de amostras e verificação automática de hashes, **jump (9 quadros, canvas 188×188)** foi selecionado para o `AnimatedSprite2D` do Godot. Dash ainda parece quase estático e hit inclui arcos vermelhos pouco apropriados, portanto permanecem candidatos até refinamento. Os PNGs de idle/run/attack aprovados não foram substituídos. O jogo ainda requer QA manual do ritmo do salto no navegador.


## Segunda rodada — idle real, dash e hit revisados

O feedback do criador em 24/11 indica que a prioridade é trocar o visual de protótipo. A Action manual **PixelLab — animações do Aren V2 (revisão)** oferece os candidatos `idle_v2`, `dash_v2` e `hit_v2`. Iniciar com idle_v2, executar primeiro com `generate=false`; para produzir PNGs escolher explicitamente `generate=true`. O workflow exige o checkpoint do Character original e o hash do mestre aprovado, sem criar outro personagem.

Os candidatos ficam em `assets/pixellab/vanguard_character_candidate/`, no artefato da execução e em branch de revisão. Não entram automaticamente no jogo. Em caso de falha após submissão, **não repetir a partir de main**: recuperar a branch/checkpoint da execução anterior e retomar a partir dela para evitar pagar novamente. Revisar todos os quadros e a continuidade antes de integrar. Idle deve manter os pés fixos, respirar e mover cabelo/cachecol; dash precisa de poses distintas e hit não deve parecer ataque.

A próxima etapa de arte após o personagem é o pacote do Crystal Imp, seguido de cenário da Floresta de Cristal (camadas, vegetação, ruínas, cristais e plataformas), preservando a física e o fallback até QA.
