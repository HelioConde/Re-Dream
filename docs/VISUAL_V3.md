# Re:Dream — Visual V3: Bosque vivo e impactos mágicos

**Data:** 2026-10-30. **Escopo:** arte original e efeitos visuais no cliente Phaser; física, colisões, dano, MP, controles e protocolo de rede permanecem iguais.

## Implementado

| Área | O que mudou | Critério verificável |
| --- | --- | --- |
| Bosque das Constelações | Duas camadas vetoriais originais independentes: véu lunar translúcido e vegetação frontal nas bordas/solo | `art/forest-atmosphere.svg` e `art/forest-foreground.svg`; 1280×720, sem scripts nem imagens externas |
| Profundidade | Névoa com leve oscilação e folhas com deslocamento diferente; plantas próximas passam à frente dos personagens somente nas bordas | `GameCanvas.tsx`: depth -11 e 6; sem mudanças em `PLATFORMS` ou `FLOOR` |
| Acessibilidade | Camadas permanecem estáticas quando `prefers-reduced-motion: reduce` estiver ativo | Sem animação ambiente no modo reduzido |
| Impactos | Contratos puramente visuais e determinísticos para básico, aéreo, dash, launcher, dive, Otto e magias MP1–3 | `combatVfx.ts`; testes de paleta, duração, determinismo e custo fixo |
| Magias | Verde menta no MP1, azul-celeste no MP2 e lilás no MP3, com progressão de círculos/raios/faíscas | `PracticeImpact.skillLevel` opcional enviado apenas após hit confirmado |
| Sentinela | Placas com gravação e núcleo de cristal com contorno lunar e reflexos | Desenho Phaser sem alterar hitbox/posição do alvo |

## Continuidade dos sistemas

- O Arena offline continua aceitando apenas **soltar Z depois de segurar** para conjurar.
- ↓ sozinho continua descendo plataformas vazadas; chão sólido continua intransponível.
- Rocket, Shadow, Otto, dash→corrida, combos, launcher e juggle não mudam.
- O Event Bus `impactConfirmed` e o `snapshot.impact` compartilham a **mesma ocorrência de dano**. A propriedade opcional `skillLevel` identifica a cor/escala visual, não decide o dano.
- Render da camada de VFX continua limitada à duração do burst; sem partículas permanentes e sem dependência de shader proprietário.
- Para modo movimento reduzido, efeitos de impacto têm um único anel breve, sem raios ou faíscas.

## Passos de teste manual

1. Abrir [Campo de Prática](https://helioconde.github.io/Re-Dream/#praticar) em desktop, verificar que a vegetação frontal ocupa principalmente as **laterais** e não cobre Aren ou a Sentinela.
2. Caminhar, saltar até as duas plataformas e atravessá-las com ↓. As novas camadas devem ser apenas decorativas.
3. Atacar próximo do alvo: aparecer um burst dourado; atacar fora do alcance: **nenhum** burst deve aparecer.
4. Segurar Z por cerca de 0,65, 1,30 e 1,95 segundo e soltar, com MP suficiente. Comparar verde/azul/lilás e escala progressiva do impacto quando acertar.
5. Habilitar `prefers-reduced-motion` e confirmar que a névoa fica estática e os efeitos usam um único anel de curta duração.
6. Validar desktop e mobile: especialmente 1600×900 e 390×844 e ausência de controles encobertos.

**QA visual em navegador: pendente.** Testes e build não provam equivalência com o concept art nem desempenho em aparelhos reais. A arte do protagonista ainda é vetorial; o objetivo de sprites 2D ilustrados permanece aberto.
