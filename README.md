# Re:Dream ✧

**O Recomeço de um Sonho** — projeto independente de RPG de ação 2D cooperativo para navegador. Esta é uma pré-alfa com universo próprio e gráficos temporários.

## Tecnologia

- **Site, lobby e HUD:** React + TypeScript + Vite
- **Cena 2D:** Phaser 4
- **Multiplayer:** servidor Node.js com WebSocket (`ws`), com movimento e combate calculados no servidor
- **Hospedagem do frontend:** GitHub Pages via GitHub Actions

```text
apps/
  web/                    React, Phaser e interface
  server/                 salas WebSocket, combate e testes
.github/workflows/pages.yml  CI e publicação automática do site
```

## Executar localmente

Requer Node.js 22+ e npm.

```bash
git clone https://github.com/HelioConde/Re-Dream.git
cd Re-Dream
npm install
npm run dev
```

Abra **http://localhost:5173**. O WebSocket de desenvolvimento usa **ws://localhost:3001/ws** automaticamente.

```bash
npm test    # testes da simulação
npm run build   # compila frontend e servidor
npm run start:server   # servidor Node compilado
```

## Jogabilidade implementada

Na tela inicial, escolha um apelido e clique em **Criar nova sala**. Compartilhe o código da sala para que outros jogadores entrem. Cada sala aceita até quatro aventureiros. A masmorra inicial tem três ondas de inimigos e um chefe.

**Controles:** A/D ou setas para caminhar, W/espaço para pular, J/Z para atacar, K/X para habilidade especial. Os botões de toque aparecem em telas menores.

## Publicação no GitHub Pages

O workflow `.github/workflows/pages.yml` testa e compila o projeto e envia **somente** `apps/web/dist` ao GitHub Pages.

Configure no repositório **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Endereço esperado do frontend: **https://helioconde.github.io/Re-Dream/**.

**Importante:** GitHub Pages não executa Node, WebSocket ou PHP. A página inicial funciona sozinha, mas para entrar nas partidas será necessário hospedar o servidor Node em outro serviço com WebSocket persistente e TLS (`wss://`).

1. Hospede `apps/server/` em uma plataforma Node.js compatível com conexões WebSocket persistentes (por exemplo, VPS ou PaaS que aceite WebSocket).
2. Defina no servidor `ALLOWED_ORIGINS=https://helioconde.github.io` e `PORT` conforme a hospedagem. Exponha `/ws` via endereço **wss://**.
3. Vá em **Settings → Secrets and variables → Actions → Variables**, crie a variável **VITE_WS_URL** com a URL completa, por exemplo `wss://ws.seudominio.com/ws`.
4. Rode novamente o workflow do GitHub Pages. Não coloque credenciais privadas na variável `VITE_`; os valores são públicos no frontend.

Se futuramente você usar uma hospedagem PHP, os arquivos estáticos compilados do React podem ser servidos nela; o processo de WebSocket ainda precisará de hospedagem compatível.

## Dados locais (sem banco de dados)

Nesta etapa, o navegador salva **apelido**, **última sala**, **vitórias**, **derrotas** e **data da última sessão** no \`localStorage\` (chave \`redream:profile:v1\`). O site contém a seção "Minha jornada local" e a opção para apagar os dados. O perfil não é sincronizado entre navegadores ou dispositivos.

As salas, inimigos, vida e movimentação continuam em **memória no servidor WebSocket**; o navegador nunca decide os danos. **Recarregar a página encerra a conexão.** Uma sala sem jogadores ou reiniciada no Render desaparece. Não existe salvamento de inventário ou contas; dados de \`localStorage\` não são confiáveis para moedas ou progressão competitiva.

Para testar: abra duas janelas (uma anônima, se quiser perfis independentes), crie uma sala na primeira e entre pelo código na segunda. Depois mova os personagens, ataque e confirme a sincronização.

### Testes automáticos

\`\`\`bash
npm test            # física, regras, perfil local e duas conexões WebSocket no servidor de teste
npm run build       # compilação das aplicações
node scripts/smoke-live.mjs  # testa /health e duas conexões WSS no Render publicado
\`\`\`

O GitHub Actions inclui um workflow separado em [Live smoke test](.github/workflows/live-smoke.yml), acionado manualmente ou quando seu script é alterado. Para testes externos, Render Free pode estar dormindo e demorar para responder.

## Escalabilidade e limitações

O servidor inicial mantém as salas em memória em **uma instância** e atualiza a simulação 30 vezes por segundo, enviando snapshots 10 vezes por segundo. Possui limite de participantes, verificação básica da origem (quando configurada), de payload e de taxa de mensagens. O cliente envia botões pressionados; o servidor decide posições e danos.

**Ainda não existe:** autenticação, persistência, reconexão à mesma sessão, rede multi-instância, rate limit por IP e métricas de produção. Portanto, esta versão **não está validada para milhares de usuários simultâneos**. As próximas etapas são cache distribuído, roteamento de salas, testes de carga, banco de dados e sistemas de progressão.

## Direito autoral

Re:Dream é original e independente. Não utilizar sprites, personagens, músicas, logos, mapas ou outros materiais de Grand Chase.


## Lobby e movimento responsivo

Antes da masmorra, cada grupo entra no **Salão dos Sonhos**. O líder cria e compartilha o código, acompanha até quatro participantes e inicia a missão quando o grupo estiver reunido. Não existem inimigos ativos no lobby.

O personagem controlado pelo usuário usa **previsão local**: o movimento e o salto são desenhados instantaneamente no navegador, enquanto o servidor continua responsável pelo combate e corrige diferenças grandes. Os outros jogadores recebem posições pela rede e passam por suavização.

A primeira personagem visual jogável é a **Vanguarda das Rosas** (atlas vetorial de oito quadros em `apps/web/public/sprites/rose-vanguard-atlas.svg`), criada como uma base original inspirada na referência enviada. É uma arte inicial: as animações ilustradas completas ainda devem ser refinadas para evitar recortes e diferenças de silhueta.
