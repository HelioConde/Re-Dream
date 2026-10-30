<div align="center">

<h1>✨ Re:Dream</h1>

<strong>O recomeço de um sonho — RPG de ação e plataformas 2D cooperativo para navegador</strong>

<p>Personagens, combate em tempo real, salas de até quatro jogadores e um mundo de fantasia em desenvolvimento.</p>

<a href="https://helioconde.github.io/Re-Dream/"><img alt="Versão web" src="https://img.shields.io/badge/JOGAR%20NO%20NAVEGADOR-Pr%C3%A9--alfa-64748b?style=for-the-badge"></a>
<a href="https://github.com/HelioConde/Re-Dream"><img alt="TypeScript e Phaser" src="https://img.shields.io/badge/TypeScript%20%2B%20Phaser-3178C6?style=for-the-badge"></a>

<p><a href="https://helioconde.github.io/Re-Dream/"><strong>Abrir frontend</strong></a> · <a href="#como-executar"><strong>Executar localmente</strong></a> · <a href="docs/REDESIGN_GAME_UI.md"><strong>Documentação da interface</strong></a></p>

</div>

---

## O que é Re:Dream?

**Re:Dream** é um jogo independente inspirado na vontade de retomar um projeto antigo e transformá-lo em uma experiência original. A ideia é unir a ação de um RPG de plataforma com cooperação online e sistemas que possam crescer por etapas.

**Estado:** **pré-alfa jogável**, com conteúdo de demonstração. Personagens, sprites e partes da interface podem usar recursos temporários. Não há inventário persistente, economia online ou rede multi-instância de produção.

## Jogabilidade atual

- **Salas cooperativas:** crie uma sala, compartilhe o código e convide até três outros jogadores.
- **Combate:** movimente-se, pule, ataque e use uma habilidade especial.
- **Missão inicial:** masmorra de demonstração com ondas de inimigos e chefe, conforme implementação documentada.
- **Lobby:** reúne participantes antes do início da partida.
- **Controles touch:** botões para telas menores no frontend.
- **Regras online:** o servidor WebSocket controla movimento e dano, enquanto o cliente oferece resposta visual imediata.

| Controle | Ação |
| --- | --- |
| `A` / `D` ou setas | Mover |
| `W` ou `Espaço` | Pular |
| `↓` | Descer de plataformas vazadas (treino; servidor online atualizado necessário) |
| `J` ou `Z` | Atacar |
| `K` ou `X` | Habilidade |

## Como executar

Requisitos: **Node.js 22+** e npm.

```bash
git clone https://github.com/HelioConde/Re-Dream.git
cd Re-Dream
npm install
npm run dev
```

O desenvolvimento inicia **frontend e servidor**. Abra `http://localhost:5173`; a conexão WebSocket local usa `ws://localhost:3001/ws`.

```bash
npm test
npm run build
npm run start:server
```

O último comando inicia o servidor já compilado, não substitui automaticamente o frontend.

## Tecnologias e estrutura

| Parte | Tecnologia |
| --- | --- |
| Interface, lobby e HUD | React · TypeScript · Vite |
| Cena e movimentação 2D | Phaser |
| Multiplayer | Node.js · WebSocket (`ws`) |
| Publicação da interface | GitHub Pages · GitHub Actions |

```text
apps/web/                Interface, personagens e Phaser
apps/server/             Salas, simulação e regras multiplayer
docs/                    Design de interface e auditorias de assets
scripts/                 Testes e verificações
.github/workflows/       CI e publicação
```

## Online: o que funciona e o que exige infraestrutura

O endereço do GitHub Pages hospeda **apenas o frontend estático**. Mudanças de controles online, incluindo **↓ para descer plataformas**, só funcionam após o servidor WebSocket remoto executar a versão correspondente; publicar somente o GitHub Pages não atualiza o servidor. O serviço WebSocket precisa rodar em hospedagem separada que suporte conexão persistente via **`wss://`**; o GitHub Pages não executa esse servidor.

Ao publicar uma instância própria:

1. Configure o servidor Node com origem autorizada e porta da plataforma.
2. Disponibilize o endpoint público `wss://...`.
3. Configure a variável de build **`VITE_WS_URL`** com a URL pública do WebSocket.
4. Recompile o frontend e faça o deploy.

Salas e combates ficam **em memória de uma única instância do servidor**. Uma reinicialização apaga as salas. Preferências e pequenos dados de perfil local ficam no navegador, não sincronizados entre dispositivos. **Não há autenticação nem salvamento online permanente.**

## AI Game Studio — skills de desenvolvimento

O projeto inclui um conjunto **enxuto de 9 skills para IA** em `.claude/skills/`, adaptado ao fluxo Phaser + TypeScript do Re:Dream: GDD, backlog, FSM, Event Bus, conversão de engine, stack traces, performance, shaders e prompts de assets.

- [Guia de uso e catálogo](docs/AI_GAME_STUDIO.md)
- [GDD vivo](docs/GDD_RE_DREAM.md) e [backlog técnico](docs/BACKLOG_RE_DREAM.md)
- [Instruções para Codex e outros agentes](AGENTS.md)

No Claude Code, abra a **raiz** do repositório e use, por exemplo, `/gdd-dinamico` ou `/backlog-gameplay`. No ChatGPT/Codex, leia o `AGENTS.md` e a skill correspondente; o registro de comandos não ocorre automaticamente nesses clientes. A validação estrutural é executada com `npm run test:skills` e também em `npm test`.

As skills são **instruções de desenvolvimento**, não plugins de execução do jogo. Nenhuma engine ou mecânica do multiplayer foi substituída.

## Próximos marcos

| Já existe como base | Ainda precisa evoluir |
| --- | --- |
| Seleção e navegação pré-alfa | Roster definitivo com sprites próprios |
| Sala online e cooperação local/testável | Reconexão e infraestrutura escalável |
| Movimentação e combate | Mais animações, golpes e inimigos |
| Dungeon demonstrativa | Mundo, regiões e progressão persistente |

O foco é deixar a jogabilidade agradável **antes** de expandir a história e a quantidade de conteúdo.

## Artes, licenças e créditos

Re:Dream é um projeto **independente e original**, sem afiliação com Grand Chase. A inspiração de gênero não autoriza redistribuir personagens, logotipos, música ou assets protegidos de terceiros.

Alguns pacotes presentes no repositório são **materiais de estudo ou referência**. Confira a licença individual antes de reutilizar ou distribuir qualquer recurso.

[**Arquitetura e redesenho da UI**](docs/REDESIGN_GAME_UI.md) · [**Inventário de assets**](docs/ASSET_INVENTORY.md) · [**Documentação detalhada anterior**](docs/README_REFERENCE_2026-10-25.md)

---

<div align="center"><strong>Criado por <a href="https://github.com/HelioConde">Hélio Conde</a></strong></div>
