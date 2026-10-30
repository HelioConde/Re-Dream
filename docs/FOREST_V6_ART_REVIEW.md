# Re:Dream — Bosque das Constelações V6: relevo e leitura visual

**Origem:** captura real enviada pelo jogador em 30/10/2026 após a revisão de escala V5.

## Observações verificadas na captura

- Aren aparece em escala mais coerente com o piso e com a Sentinela, e a sola já parece encaixada na faixa de grama. **Preservar tamanho 160px** até novo playtest.
- A interface ficou mais limpa, com indicadores de HP e nome no HUD superior, não sobre o avatar.
- O fundo ainda é dominado por formas geométricas de baixo detalhe: montanhas triangulares, massas de folhas ovais, arco praticamente sem talha de pedra e cachoeira sem textura.
- Lua e névoa ocupam grande área. Mais brilho difuso não resolve o contraste: é melhor acrescentar leitura de planos com **contornos, relevos e detalhes localizados**.

## Entrega V6

1. **Montanhas:** silhuetas de cristas menos regulares no SVG base (sem alterar o céu ou o horizonte); camada de contornos quebrados e relevos discretos.
2. **Árvore à esquerda:** troca de quatro elipses na silhueta principal por copas orgânicas e irregulares, mais ramificações, conjuntos de folhas e detalhes de luz.
3. **Portal de ruínas:** juntas entre blocos, fissuras, inscrições lunares, musgo e brilho de pedra concentrado nas bordas.
4. **Cachoeira:** filetes de água, highlights, espuma e brilho contidos na área direita do cenário.
5. **Plataformas:** estrias e vinhas sob a borda de pedra. **Mantidos** topos físicos das plataformas em (220,466,220) e (690,414,250), e o chão físico em y=596.
6. **Solo:** pedras pequenas, fissuras e musgo discretos abaixo da superfície onde o personagem anda.
7. **Performance:** um único `forest-detail.svg` original 1280×720, transformado em **textura estática Phaser** com profundidade -16. Nenhuma atualização de formas SVG a cada frame; as camadas atmosféricas existentes continuam independentes.

## Compatibilidade

Sem alterações em escala V5, Aren, 23 movimentos, 151 quadros, FPS de animação, input, MP ou física. A nova camada é puramente visual, não possui colisões, imports ou recursos de terceiros. Ausência da textura permite continuar jogando com o cenário base.

## Verificação

- Testes Node confirmam referências, profundidade e substituição das silhuetas anteriores.
- Teste XML Python valida as três camadas do bosque e os grupos de ornamento.
- GitHub Actions executa testes, verificação das skills, geração de sprites e build.

**Limite:** arte ainda é vetorial; não é pintura final. A screenshot V5 do usuário é a base do diagnóstico, mas **nenhuma captura de navegador V6 foi realizada nesta PR**. A avaliação de contraste, legibilidade e presença dos detalhes deve ser feita após publicação, incluindo celular e movimento reduzido.

## Próxima melhoria de maior impacto

Produzir ilustrações originais finalizadas por planos (céu, montanhas, ruínas, copa, pedra, solo) e alinhar spritesheets desenhados do Aren e da Sentinela com esse nível de acabamento. Antes de otimizar filtros ou criar novas partículas, medir o tempo de carregamento do conjunto de 151 SVGs.
