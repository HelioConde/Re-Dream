# Eclipse Vanguard Godot — Combate herdado de Re:Dream, etapa 3

## Mecânicas incrementais
- **J**: sequência de **quatro** ataques, com quarto golpe de 0,39s e maior recuo do inimigo; sem nova arte PixelLab para este movimento, usa fallback de ataque existente.
- **Rocket Step**: durante o dash, pressionar pulo inicia impulso vertical -690 e deslocamento horizontal de 475 por 0,52s; substitui o dash ativo.
- **Shadow Step**: pressionar ↓/S **enquanto estiver no ar durante o Rocket** interrompe a subida e inicia descida acelerada com efeito violeta. Não altera a colisão do chão.
- **Chase jump**: ao atingir inimigo com ↑+J (launcher), o herói ganha uma janela de 0,75s para saltar mais alto (-760), permitindo perseguição aérea.
- **Feedback**: efeitos luminosos independentes do PixelLab. PNGs existentes permanecem intactos.

## Limites
Este é um porte parcial das sensações de combate de Re:Dream, **não** uma reprodução de sua física original. Otto, juggling avançado, ajustes finos de cancelamento, câmera e multiplayer continuam pendentes. Ainda falta QA manual de controles (teclado, navegador, taxa de atualização) e animações específicas.

## Testes
`tests/smoke_test.gd` valida sequência de quatro golpes, reinício de combo, impulso Rocket, transição Shadow e consumo da janela de chase; o GitHub Actions verifica compilação e exportação Godot Web.
