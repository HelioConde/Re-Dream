# Re:Dream — Aren V7: redesign da silhueta e do equipamento

**Base visual:** recorte do Aren enviado pelo jogador em 30/10/2026. O personagem já está na escala correta de 160px dentro da arena; esta mudança refina a arte original gerada, sem redimensionar a física.

## Problemas observados na captura

- Rosto arredondado e olho dominante, dando aparência mais infantilizada do que a fantasia de ação desejada.
- Cabelo com pontas repetitivas, sem direção consistente.
- Tronco estreito em relação à cabeça, botas muito finas e roupa com pouca separação de materiais.
- Capa com formato plano e pouca indicação de dobra.
- **Espada desaparecia nas poses fora de ataque:** `drawArenFrame` desenhava a arma apenas dentro de `if (attack)`.

## Entrega V7

| Região | Correção aplicada |
| --- | --- |
| Cabeça/expressão | Formato de face menos circular, olho menor, sobrancelha definida, linha de nariz, variações de boca e piscar preservado |
| Cabelo | Mechas direcionais sobrepostas, franja e brilho azul-acinzentado suave, mantendo o tom original |
| Corpo | Ombros mais largos e postura idle com peso levemente deslocado; perna proporcionalmente mais longa dentro do mesmo quadro |
| Capa | Dobra adicional, bordado de contorno, ponta articulada e oscilação sutil nos frames, sem esconder demais a espada |
| Braço/roupa | Bracelete segmentado, reforço de antebraço, costuras do colete, cinto e ombreira mantidos |
| Botas | Sola separada, biqueira clara e caneleira mais robusta |
| Espada | Sabre lunar com guarda metálica, núcleo luminoso e ponta visível em **idle, walk, run, dash, rise, fall, rocket, shadow, land e hurt** |
| Ataques e magia | Continua usando coreografias próprias V4 e crescente MP3; não se desenha espada de descanso sobre efeitos de magia |
| Publicação | Campo de Prática e Ateliê identificam `AREN V7` / `AREN ART V7` |

**Escala preservada:** quadros SVG 192×192, exibidos com 160px dentro do Phaser, mesmo pivô de pés no piso; não mudou o `AREN_DISPLAY_SIZE`.

## Contratos técnicos

- O gerador `scripts/generate_aren_art.mjs` continua produzindo **151 quadros SVG em 23 estados**.
- Cada quadro tem arte vetorial transparente; nenhuma imagem externa, atlas comercial ou asset de personagem antigo foi reintroduzido.
- Alterações são **somente de apresentação**: não afetam golpes confirmados, dano, MP, input `Z`, descida `↓`, gravidade, colisões nem servidor WebSocket.
- Testes validam espada nas poses comuns, ausência de espada duplicada em golpes e magias, expressões, detalhe de bota e capa e os 151 frames gerados.

## Como verificar

1. Abra `https://helioconde.github.io/Re-Dream/?v=aren-v7#praticar` depois do deploy e confirme o identificador `AREN V7 · PERSONAGEM REFINADO`.
2. No ateliê `Inspecionar animações`, compare **Parado / Respiração** (quadro 1 e piscada), **Caminhar**, **Corrida**, **Salto / Subida** e **Pouso**: a espada não deve sumir.
3. Compare combos I–IV e magias MP1–3: não deve haver espada estática duplicada em cima das animações ofensivas.
4. Verifique a leitura do novo rosto, cabelo e roupa na escala real (160px). Também inspecione o Ateliê ampliado.
5. Teste `↓` atravessando plataforma e `Z` segurado e solto: continuam inalterados.
6. Faça uma screenshot do jogo no desktop e no celular para avaliar legibilidade e tamanho relativo ao cenário.

## Limitação

**Este redesign continua vetorial.** Refina a arte procedimental original, mas não equivale a sprites 2D pintados profissionalmente. Testes automatizados validam estrutura e lógica; **não substituem um screenshot real da V7 no navegador**. O grande avanço artístico posterior permanece a criação de spritesheets ilustrados com quadros consistentes e sombras autorais.
