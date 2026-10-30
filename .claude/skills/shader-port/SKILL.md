---
name: shader-port
description: "Explica e porta shaders GLSL/HLSL para a renderização web do Re:Dream com fallback e QA em WebGL."
argument-hint: "[efeito desejado ou shader-fonte]"
user-invocable: true
---

# Tradutor de shaders e VFX
1. Identifique pipeline-alvo real do Phaser 4 e capacidade de WebGL do projeto antes de escrever API.
2. Descreva efeito matematicamente: entradas, uniformes, espaço de coordenadas, alfa/premultiplicação, tempo e custo por pixel.
3. Se o input for HLSL/Shader Graph, mapeie nomenclatura e recursos não suportados; **não presuma compatibilidade 1:1**.
4. Para água, dissolve, outline e brilho, crie implementação mínima com uniformes explícitos, fallback 2D sem shader e ajuste para `prefers-reduced-motion` quando animado.
5. Verifique compile runtime, resize, device pixel ratio, alpha blending, descarte do pipeline e recuperação de contexto.
6. Só declare ganho de performance após medição em hardware real; anexe screenshot ou assinale 'QA visual pendente'.

## Direitos
Não copiar shaders proprietários sem licença. Identidade visual original do Re:Dream.
