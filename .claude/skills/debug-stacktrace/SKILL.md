---
name: debug-stacktrace
description: "Investiga stack traces de TypeScript, Phaser, Node, Vite e GitHub Actions com evidências e correção mínima."
argument-hint: "[erro, log ou falha de workflow]"
user-invocable: true
---

# Detetive de stack trace
1. Identifique o **primeiro erro causal** no log (não só o último `npm ERR!`).
2. Registre arquivo, linha, versão, passo de reprodução, input e se é browser, build, teste ou servidor.
3. Leia a região do arquivo e o teste que cobre o caminho. Não adivinhe uma linha quando stack é minificada ou sem source map.
4. Formule 1–3 hipóteses ranqueadas e um experimento discriminante; marque hipóteses não verificadas.
5. Corrija o menor trecho, acrescente teste de regressão e execute `npm test` e `npm run build`.
6. Para falha GitHub Actions, leia execução e logs com o conector; não mesclar uma PR vermelha.
7. Em Phaser/React, verificar ainda eventos duplicados, stale refs, input repetido, unload de textura, perda de contexto WebGL e limpeza de listeners.

## Formato de relatório
**Sintoma; evidência; causa confirmada ou hipótese; correção; testes passados/não executados; riscos remanescentes.**
