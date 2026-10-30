# Aren Art V4 — poses-chave e magia de assinatura

**Escopo:** apresentação gráfica original do Re:Dream, sem alterar entradas, colisões, dano, MP, server WebSocket ou hitboxes. A arte permanece vetorial e precisa de revisão visual em navegador.

## Problema identificado

Nas 151 imagens da versão anterior, `attack_1` a `attack_4` usavam a mesma equação de braço (`sin(phase * PI) * 36`). A espada e os efeitos tinham diferenças pequenas e acabavam parecendo a mesma animação. O conceito original do Aren — cabelo escuro, capa verde-azulada, crescentes e fantasia lunar — exige poses mais expressivas, sobretudo no final dos combos.

## Alterações implementadas

- **Nove coreografias distintas:** `attack_1`, `attack_2`, `attack_3`, `attack_4`, `dash_attack`, `air_attack`, `launcher`, `dive` e `otto` agora têm configuração própria de tronco, passo, braço, reação da capa, posição e direção da lâmina.
- **Antecipação → impacto → recuperação:** transição determinística entre poses-chave em cada sequência, com trajetória de lâmina orientada por ação.
- **Espada lunar legível:** guarda prateada, núcleo claro e rastro colorido da arma. O golpe final, Combo IV, possui um segundo crescente de energia e brilho especial.
- **MP3 Dream Crescent:** efeito original de crescente mágico lilás e cinco estrelas orbitais, apenas na habilidade máxima. MP1 e MP2 conservam seus cristais e cores próprios.
- **Mesmo sistema de animação:** preservados 23 estados, 151 quadros, dimensões transparentes 192×192, espelhamento do personagem e a oficina de inspeção.
- **Identificação de versão:** Campo de Prática e Ateliê exibem **AREN ART V4** para evitar confusão com capturas de versões antigas.

## O que testar

1. Abra `https://helioconde.github.io/Re-Dream/?v=aren-art-v4#praticar`. A legenda deve indicar **AREN ART V4**, e não `visual14`.
2. Clique em **Inspecionar animações** e compare o quadro 4 dos Combos I–IV. Verifique se a direção da espada, a inclinação do corpo e a posição das pernas são realmente diferentes.
3. Veja **Combo IV** quadro a quadro e confira o crescente extra da finalização.
4. Veja **Lançador**, **Mergulho**, **Otto** e **Golpe do dash** separadamente. Ações devem ter silhuetas distintas, não só cor diferente.
5. Compare **Magia MP1**, **Magia MP2** e **Magia MP3**; o crescente de estrelas lilases deve ser exclusivo de MP3.
6. No jogo, teste ↓ atravessando uma plataforma, Rocket/Shadow, combo e Z segurado/solto. Essas regras não foram modificadas.

## Critérios e limitações

- Testes verificam SVGs transparentes, sequências distintas, elementos exclusivos de Combo IV e MP3, compatibilidade com os controles e build.
- **A diferença de qualidade entre sprites vetoriais e a ficha ilustrada ainda existe.** Os novos quadros não são sprites 2D pintados manualmente.
- **Screenshot e game feel da V4: não verificados neste PR.** Registrar capturas desktop/mobile antes de declarar equivalência visual ao conceito.
- Melhorias futuras prioritárias: spritesheet ilustrado com pivô constante, animação da Sentinela de Cristal, otimização das 151 texturas em atlas após medições, identidade visual dos demais cenários.
