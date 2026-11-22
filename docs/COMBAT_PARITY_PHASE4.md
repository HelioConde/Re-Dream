# Re:Dream → Eclipse Vanguard: combate aéreo, etapa 4

## Escopo

- Otto: ↑/↓/J/Z não mudam; ao pressionar **↓+Z ou ↓+J na borda de uma plataforma vazada**, o golpe especial Otto atravessa a plataforma usando a exceção individual existente. Na mesma frame, o golpe tem prioridade sobre a descida normal. Se ↓ for pressionado antes de Z/J, a descida normal pode acontecer primeiro; melhorar a janela de chord futuramente.
- Dive: **↓+Z/J no ar** executa estocada para baixo, atravessa somente plataformas one-way durante 0,6s. Não modifica colisão do chão sólido nem dos inimigos.
- Juggle: inimigos levantados podem receber até **3 reerguidas** ao serem atingidos no ar; dano posterior permanece, mas não sustenta suspensão indefinidamente. Reset ocorre ao pousar.
- Visual: trilho ciano para Otto e dive; animações PixelLab específicas ainda pendentes. As existentes permanecem com fallback.

## Teste / riscos

Conferir em teclado e touchscreen: ↑+Z launcher → ↑ chase → J no ar; ↓+Z no ar dive; ↓+Z na borda Otto. A fase 4 não implementa hitstop nem cancelamento completo, e a janela de toque conjunto ↓+Z/J requer refinamento. Evitar travar a descida comum e sempre limpar exceções de plataforma em morte e pouso.
