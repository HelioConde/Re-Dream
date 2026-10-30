---
name: gdd-dinamico
description: "Cria ou atualiza um GDD enxuto do Re:Dream a partir de ideias soltas, sem confundir planejado com implementado."
argument-hint: "[ideia ou mudança de mecânica]"
user-invocable: true
---

# GDD dinâmico — Re:Dream
Leia `AGENTS.md`, `README.md`, `docs/GDD_RE_DREAM.md` e o código do sistema afetado.

## Procedimento
1. Transforme a ideia em **fantasia do jogador**, objetivo, entradas, comportamento observável, game loop, sistema impactado e restrições.
2. Separe em tabelas **Implementado (com arquivo/funcão confirmados)**, **Proposto** e **Fora de escopo**. Não invente uma feature pelo fato de aparecer num README antigo.
3. Descreva ao menos um fluxo de sucesso, um erro/edge case e um teste manual de sensação de jogo.
4. Consulte alterações anteriores em `docs/GAMEPLAY_ARCADE_REFERENCE.md` e teste o mapa de controles para não reintroduzir A/S/D/K como atalhos de magia.
5. Se uma decisão de design alterar interface com o servidor WebSocket, marque como **mudança de contrato** e proponha migração/testes de compatibilidade.
6. Atualize apenas `docs/GDD_RE_DREAM.md` e, se necessário, o backlog, sem reescrever mecânicas não solicitadas.

## Resultado mínimo
- Seção com premissa, loop, mecânicas, tuning knobs quando medidos, riscos, escopo e critérios observáveis.
- Cada afirmação de estado acompanha referência ao código, não apenas opinião.
- Não prometer números de desempenho nem funcionalidades futuras como concluídas.
