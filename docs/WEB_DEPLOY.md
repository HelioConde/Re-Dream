# Publicação Web — Eclipse Vanguard

O protótipo é desenvolvido em Godot e disponibilizado para navegador por meio de GitHub Actions + GitHub Pages.

## URL pública

Após o primeiro deploy bem-sucedido: https://helioconde.github.io/Re-Dream/

## Funcionamento

1. Um push na branch `main` ou a execução manual do workflow **Publicar jogo no GitHub Pages** inicia a publicação.
2. O runner instala o Godot **4.7.2** e os templates de exportação.
3. O projeto é importado e o smoke test de combate é executado.
4. O preset `Web` gera `dist/index.html` e seus arquivos WebAssembly.
5. Os arquivos são enviados como artefato do GitHub Pages, que realiza o deploy.

Em pull requests, a exportação é validada sem publicar em produção.

## Configuração do repositório

Em **Settings → Pages → Build and deployment → Source**, selecionar **GitHub Actions**. Não usar o workflow de HTML estático, pois a Godot precisa gerar a exportação Web.

## Compatibilidade

- Renderizador: Godot Compatibility/WebGL 2.0.
- Exportação com `variant/thread_support=false` para evitar depender dos headers de cross-origin isolation ausentes no GitHub Pages.
- Requer navegador com suporte a WebAssembly e WebGL 2.0.
- Os controles atuais são por teclado; não há controles touchscreen nesta versão.

## Diagnóstico

- Conferir a Action em `https://github.com/HelioConde/Re-Dream/actions/workflows/deploy-pages.yml`.
- Se a Action indicar permissão negada, conferir **Settings → Actions → General** e a configuração do ambiente `github-pages`.
- Se a exportação falhar, o workflow não publicará um site incompleto.
