---
name: asset-prompts
description: "Cria prompts para sprites, personagens, backgrounds e texturas consistentes com Re:Dream e com QA de animação."
argument-hint: "[asset, estilo, formato]"
user-invocable: true
---

# Gerador de prompts de assets
1. Leia `docs/ASSET_INVENTORY.md`, `docs/SPRITE_ASSET_AUDIT.md` e as dimensões atuais em `apps/web/src/arenAnimation.ts` e `scripts/generate_aren_art.mjs`.
2. Especifique uso real: jogador, inimigo, tileset, VFX, UI; escala no jogo, transparência, paleta e origem/pivô do pé.
3. Para sprites, descreva vista, silhueta, iluminação, quantidade de frames e **mesmo enquadramento em todos os frames**; propor idle/walk/run/attack/jump separadamente quando necessário.
4. Para tile seamless, defina bordas idênticas, repetição horizontal/vertical, sem sombras cruzando a borda e sem marcas de água.
5. Entregue prompt positivo, prompt negativo, dimensionamento, formato, naming convention e checklist de inspeção.
6. Não usar nomes/personagens protegidos como pedido de cópia; descrever qualidades visuais abstratas. Verificar licença de geradores e outputs.
7. Nenhum asset é considerado pronto até conferir consistência, alfa, escala, alinhamento de pés e preview em jogo.

## Saída
Ficha de asset com id, destino, resolução, prompt, negative prompt, QA e origem/licença (ou 'não verificado').
