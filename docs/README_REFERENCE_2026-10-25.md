# Documentação anterior — Re-Dream

> Referência histórica preservada na reorganização de 25/10/2026. Para uma visão geral e instruções atuais, consulte [README principal](../README.md).\n
---

# Re:Dream ✧ — O recomeço de um sonho

**RPG de ação 2D cooperativo em desenvolvimento para navegador, com combate, salas online e progressão planejada.**

[**Repositório**](https://github.com/HelioConde/Re-Dream) · [**Frontend no GitHub Pages**](https://helioconde.github.io/Re-Dream/)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Phaser](https://img.shields.io/badge/Phaser-4-6554C0) ![Node.js](https://img.shields.io/badge/Node.js-WebSocket-339933?logo=nodedotjs&logoColor=white) ![Status](https://img.shields.io/badge/status-pré--alfa-64748b)

## Visão rápida

| Aspecto | Estado documentado |
| --- | --- |
| Gênero | RPG de ação e plataformas 2D |
| Plataforma | Navegador, com controles de teclado e toque |
| Sessões | Salas cooperativas de até quatro participantes |
| Servidor | Node.js e WebSocket, com regras de combate no servidor |
| Persistência | Preferências locais; sem contas ou progressão permanente no backend |
| Maturidade | Pré-alfa; servidor precisa de hospedagem própria |

**Teste local:** `npm install && npm run dev` (Node.js 22+). A interface inicia em `http://localhost:5173`.

> **Importante:** o GitHub Pages publica apenas a interface estática; partidas online dependem do serviço WebSocket rodando separadamente. Este é um projeto autoral independente, sem vínculo com Grand Chase.

### Navegação

[Instalação completa](#executar-localmente) · [Controles e jogabilidade](#jogabilidade-implementada) · [Publicação](#publicação-no-github-pages) · [Limitações técnicas](#escalabilidade-e-limitações)

---

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

A primeira personagem visual jogável é a **Vanguarda das Rosas**. O Phaser carrega `apps/web/public/sprites/rose-hero-real.webp`, um atlas ilustrado de oito quadros (4 colunas × 2 linhas, 64×64 por quadro), recortado diretamente da spritesheet gerada para esta personagem. Metadados em `rose-hero-real.json`. Quadros: idle 0–1, correr 2–4, atacar 5–6 e habilidade 7. O antigo atlas SVG simplificado foi removido. Esta é uma versão WebP compactada para testes; a spritesheet ilustrada original em alta resolução permanece disponível na conversa e as animações definitivas ainda precisam de refinamento de qualidade/posição dos pés.


## Atualização dos sprites do ZIP

O personagem de teste agora usa **os 8 quadros reais de caminhada para esquerda e os 8 quadros reais de caminhada para direita** extraídos de `char free.zip`. Não aplicamos `flipX`, pois o pacote possui as duas direções. O servidor continua autoritativo e a movimentação local permanece preditiva. Os sprites são carregados em `apps/web/public/sprites/imported/char/`. O arquivo original não fornece quadros de ataque, habilidades, salto ou morte; efeitos durante essas ações são provisórios e não se apresentam como animações originais. A licença do pacote deve ser verificada antes de uso comercial.

O pacote `Little Dreamyland - Free Pack.zip` **não é usado**, porque sua licença restringe o uso a projetos não comerciais e não permite redistribuição do pacote. Os arquivos derivados anteriormente publicados por nosso importador foram excluídos. Se o ZIP original permanecer no repositório público, convém removê-lo da distribuição pública após manter uma cópia particular autorizada.


## Tela de seleção de personagens (pré-alfa)

**Fluxo:** página inicial → escolher personagem → criar/entrar em uma sala → lobby → líder inicia masmorra. Cada jogador escolhe independentemente e pode trocar de personagem no lobby antes do começo. O servidor valida a escolha e compartilha a aparência nos snapshots via WebSocket; a escolha também fica salva em `localStorage` sob `redream:profile:v1`. Não existe banco de dados.

**Jogáveis neste momento:**
- `rose` — **Guerreira das Rosas**: sprites ilustrados da personagem Re:Dream, por enquanto com oito quadros compactados.
- `wanderer` — **Viajante**: oito quadros reais para caminhada à esquerda e oito para direita, do pacote `char free.zip`, sem espelhamento automático.

**Mesmo combate e atributos** para ambos — estamos testando somente a aparência, não classes ou balanceamento. Outros pacotes da raiz foram deixados de fora da seleção por faltar mapeamento de animações e/ou verificação de licença. O pacote Little Dreamyland tem restrições de redistribuição e não deve ser publicado como sprites soltos sem autorização.

**Teste manual sugerido:** abra dois navegadores; escolha Rosa no primeiro e Viajante no segundo; compartilhe o código; confira os dois personagens no lobby e ao iniciar a partida, caminhe para ambos os lados e troque a seleção antes de iniciar. Ao atualizar o navegador, a escolha deve continuar registrada localmente.

## Nova seleção de personagens — protótipo não comercial

A seleção agora oferece **14 aparências**: Rosa (Re:Dream), Viajante (`char free.zip`), Aventureiro Sprout (Cup Nooble), Bunny Guerreiro (Little Dreamyland), Fazendeiro Retrô e versão com Chapéu (SuperRetroRanch), duas aparências de paper-doll Mana Seed, além de Gato, Raposa, Coelhinho, Lobo, Panda e Coruja (Tiny Animals).

O servidor sincroniza a escolha com os demais jogadores. Todos têm atributos iguais e a preferência permanece no `localStorage`.

**Recursos e termos do protótipo:**
- **Little Dreamyland Free** — Starmixu & Utaskuas. Uso em jogos *não comerciais* e crédito obrigatório; não redistribuir o pacote. Foram selecionadas somente sequências necessárias à pré-alfa.
- **SuperRetroRanch Free Tier** — Gif. Uso não comercial. Não redistribuir as artes como arquivos/asset packs separados.
- **Mana Seed Farmer Sprite Free Sample** — Seliel the Shaper. Composição de camadas do arquivo de amostra; licença específica deve ser confirmada antes de lançar/distribuir comercialmente.
- **Sprout Lands** — Cup Nooble. Usado como protótipo não comercial; consultar atribuição e licença da página original.
- **Tiny Animals** — Jedimei. Permite uso pessoal e comercial em jogos, mas não redistribuir os arquivos como pacote de assets.

**Nenhum desses personagens ou arquivos de terceiros deve ser usado para treinar o PixelLab/IA sem permissão expressa.** Quando passarmos do protótipo para o jogo definitivo, vamos substituir as artes por personagens originais e rever as licenças.

A Rosa tinha o movimento visual invertido: agora usa a direção natural do sprite voltada para a esquerda e espelha somente quando caminha à direita. O teste automatizado verifica essa regra.
