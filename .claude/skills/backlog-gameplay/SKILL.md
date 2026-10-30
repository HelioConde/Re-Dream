---
name: backlog-gameplay
description: "Decompõe uma mecânica do Re:Dream em histórias pequenas, ordenadas por dependência e verificáveis por testes."
argument-hint: "[mecânica ou épico]"
user-invocable: true
---

# Backlog de gameplay — Re:Dream
Leia `docs/GDD_RE_DREAM.md`, `docs/BACKLOG_RE_DREAM.md` e os módulos envolvidos antes de quebrar a tarefa.

## Método
1. Defina a experiência desejada e o estado atual comprovado.
2. Separe contratos/dados, simulação determinística, animação/áudio/UI, integração online e QA — sem misturar em uma tarefa gigante.
3. Para cada história, crie ID estável, dependência, arquivos afetados, critério de aceite funcional, regressão e prova visual quando necessário.
4. Faça o mínimo viável primeiro; identifique explicitamente itens adiados e causas de bloqueio.
5. Evite duplicar IDs: atualize `docs/BACKLOG_RE_DREAM.md` sem remover histórico relevante.
6. Para cada história concluída, vincule PR/teste verificável; se não houve teste manual, informe 'pendente'.

## Regras
- Phaser 4/TypeScript no cliente; Node/WebSocket no servidor.
- Não extrapole a simulação offline para modo online sem testes de autoridade e sincronização.
- Um item "implementar inventário" não é aceitável sem estados vazios, seleção, persistência prevista e casos de erro.
