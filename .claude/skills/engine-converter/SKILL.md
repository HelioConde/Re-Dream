---
name: engine-converter
description: "Converte comportamentos entre GDScript, Unity C# e Phaser TypeScript com mapeamento explícito de diferenças de física e input."
argument-hint: "[origem] -> [destino] [arquivo ou mecânica]"
user-invocable: true
---

# Conversor de lógica de engine
Re:Dream usa **Phaser 4 + TypeScript**; não adicionar Unity ou Godot como dependências ao converter exemplos.

1. Leia o código completo de origem e confirme versão de engine e APIs usadas.
2. Produza uma tabela de equivalência: frame/step, tempo delta, velocidade, gravidade, colisão, signals/events, input, recursos, cenas e cleanup.
3. Traduza **comportamento**, não sintaxe: `_physics_process`, `FixedUpdate` e `Phaser.Scene.update` têm agendas/tempos distintos.
4. Preserve determinismo onde aplicável, use `dt` em segundos e trate clamp/substeps, one-way platforms e replay de inputs.
5. Distinga APIs realmente presentes das ilustrativas; documente dependências e versão.
6. Entregue TypeScript tipado e testes comparativos (cenário, input, posição esperada, tolerância), com lista das diferenças que não podem ser portadas exatamente.
7. Não reimplementar o motor de física nem tocar no servidor sem requisito expresso.
