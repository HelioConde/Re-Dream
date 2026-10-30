# Re:Dream — Direção de arte 2D de ação/fantasia

> Nota histórica: o diagnóstico abaixo descreve a versão anterior do jogo. O elenco antigo foi retirado no [reboot de Aren](AREN_REBOOT.md). A ficha conceitual de Aren é a nova meta visual; a primeira implementação usa quadros vetoriais originais, ainda não ilustrações finais.

**Início do trabalho visual:** 2026-10-30. Estado: primeira melhoria do Campo de Prática implementada, **não** equivalência gráfica com Grand Chase.

## Diagnóstico da diferença visual (feedback do jogador)
O combate evoluiu e ficou mais fluido, mas o visual ainda não transmite um jogo de fantasia 2D de ação. Os principais fatores auditados em `GameCanvas.tsx` e no pacote real de sprites:

1. **Ambiente antigo muito simples:** estrelas e montanhas geométricas, 18 troncos quase idênticos, piso plano e plataformas retangulares sem profundidade.
2. **Inimigo provisório:** uma elipse com olhos, sem linguagem visual de fantasia ou volume.
3. **Inconsistência de linguagem visual:** Luci é arte PixelLab com poses específicas; o cenário era geometria plana desenhada por `Graphics`, e outros personagens ainda vêm de pacotes diversos.
4. **HUD desconectado:** retrato representado por emoji e cards fora da paleta do palco; MP/carga abaixo da arena em vez de linguagem visual unificada.
5. **Lacunas de animação e acabamento:** armadura Fighter_Iniciante_01 apenas estática; sem sprites de equipamentos animados, silhuetas 2D coerentes para os outros personagens ou efeitos de combate autorais completos.

## Referência de qualidade, não de cópia

O objetivo é evocar jogos clássicos de plataforma e ação com personagens expressivos, mapas narrativos com três planos de profundidade, sensação de impacto e interface de batalha clara. A franquia Grand Chase é uma **referência de ritmo, composição e legibilidade**, não fonte de sprites, fundos, personagens, efeitos ou HUD para redistribuição.

**Identidade original:** Re:Dream — bosque de constelações, magia de cristal, fantasia luminosa, arquitetura antiga, paleta azul-petróleo/verde-musgo/lilás e Luci (Fighter). Manter silhuetas legíveis durante combos rápidos e plataformas atravessáveis reconhecíveis.

## Primeiro pacote visual implementado nesta PR

| Camada | Antes | Agora | Arquivo |
| --- | --- | --- | --- |
| Palco | Desenhado dinamicamente via gradientes, triângulos e retângulos | **SVG original 1280×720** com céu, lua, nuvens, ruínas, floresta, cachoeira distante e atmosfera | `apps/web/public/art/arena-dream.svg` |
| Geometria | Piso e plataformas sem volume | Musgo, pedra e videiras, mantendo o piso físico em **y=596** e plataformas em **x=220/y=466** e **x=690/y=414** | `arena-dream.svg`; testes de alinhamento |
| Render | Redesenho do cenário completo a cada frame | Textura estática por estágio em Phaser; fallback geométrico quando o SVG não carregar | `GameCanvas.tsx` |
| Alvo | Círculo/bolha com olhos | **Sentinela de Cristal**, corpo de pedra, ombreiras e núcleo luminoso, ancorado ao mesmo hitbox | `GameCanvas.tsx` |
| HUD | Emoji de punho | Retrato verdadeiro do Luci, gerado pelo importador original; cards integrados à paleta da arena | `PracticeMode.tsx`, `dream-ui.css` |

### Limitações verificáveis
- O novo cenário é **vetorial estilizado**, não pintura digital de estúdio. Ainda precisará de substituição por cenários autorais ilustrados com nível de detalhe artístico maior.
- A Sentinela é desenhada via primitivas, não possui spritesheet com idle/hurt/defeat original.
- Não foi criada nem copiada armadura animada; nenhuma textura com autoria duvidosa foi introduzida.
- A área física, a física, os inputs, o MP exclusivamente por segurar/soltar Z e o servidor multiplayer foram preservados.
- Testes de compilação/XML/estrutura **não substituem** inspeção visual em navegador. Se não houver captura real em viewport desktop/mobile, registrar QA visual como pendente.

## Critérios de aceite da próxima geração de arte (proposta)

1. **Personagem principal:** criar sprites 2D originais do Luci na mesma escala e com pivô uniforme, em estilo anime de fantasia mais coerente com a direção do palco; animar primeiro idle, walk, run, dash, rise, fall, ataque 1–4, Otto, Rocket/Shadow e habilidade MP1/2/3.
2. **Adversários:** Sentinela animada com idle, hit, stun e derrota; quando a armadura mudar, a silhueta precisa continuar legível.
3. **Cenário final:** layout 1280×720 por bioma; planos independentes de fundo/meio/frente e parallax leve opcional; manter colisão num arquivo de dados, não inferir colisão das imagens.
4. **VFX originais:** rastros de golpe por arma, faíscas de colisão, magia por nível; suporte a `prefers-reduced-motion`.
5. **HUD de partida:** retrato renderizado, HP/MP, barra de carga Z e estado do inimigo sem sobreposição no mobile.
6. **QA:** screenshots desktop 1600×900, mobile 390×844 e gameplay gravado com ataque e dash, avaliando legibilidade e consistência, além de testes automatizados e licenças.

## Fluxo com skills

`/gdd-dinamico` define objetivos visuais e escopo; `/backlog-gameplay` divide o pacote em histórias; `/asset-prompts` prepara prompts originais consistentes para cada spritesheet, textura ou fundo; `/shader-port` implementa efeitos quando existe suporte real no Phaser; `/perf-audit` mede desempenho real (não presumido).

### Próxima prioridade
Depois da estrutura de palco, **produzir sprites originais de personagem e inimigo com direção de arte uniforme** é mais importante do que continuar acrescentando mecânicas. O feedback do jogador confirma que a fluidez está melhor que a apresentação visual.
