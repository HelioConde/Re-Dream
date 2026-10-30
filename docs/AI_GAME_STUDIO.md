# AI Game Studio — fluxo leve para Re:Dream

## O que foi estudado
Inspirado em [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) (MIT; projeto com agentes e skills para Godot/Unity/Unreal). As ideias úteis são GDD curto, histórias com aceite, contrato de controle, QA com evidência e medições reais de performance. O template externo **não foi clonado nem instalado por inteiro**: seus scripts/hook/config são dependentes de Claude Code e de outros motores.

O arquivo HTML5 compartilhado descreve templates Phaser/PixiJS/Three.js; **Re:Dream já usa Phaser 4 e TypeScript**, portanto não vamos substituí-lo por um starter genérico nem tomar promessas de marketing como benchmark.

## Catálogo de skills locais
| Comando em Claude Code | Finalidade | Entrega padrão |
| --- | --- | --- |
| `/gdd-dinamico` | Atualizar conceito, regras e escopo | `docs/GDD_RE_DREAM.md` |
| `/backlog-gameplay` | Quebrar mecânica em histórias implementáveis | `docs/BACKLOG_RE_DREAM.md` |
| `/gameplay-fsm` | Projetar estados e prioridades de movimentação/combate | FSM local de locomoção integrada; combate continua planejado |
| `/gameplay-events` | Contratos Event Bus para UI/VFX/SFX | Eventos tipados e feed HUD local implementados; VFX/SFX ainda pendentes |
| `/engine-converter` | Traduzir lógica entre Godot/Unity/Phaser | Código e divergências de física/input |
| `/debug-stacktrace` | Investigar stack trace e falhas de Actions | Hipótese, linha, reprodução e correção |
| `/perf-audit` | Perfil de performance medido | Relatório com dados e limites de confiança |
| `/shader-port` | Adaptar GLSL/HLSL para pipelines compatíveis | Shader, fallback e validação |
| `/asset-prompts` | Prompts de sprites, cenários e texturas originais | Prompt, negativo, frame/paleta e QA |

Cada skill está em `.claude/skills/<nome>/SKILL.md`. Em **Claude Code**, abra o projeto na raiz para usar os comandos. Em **Codex, ChatGPT Desktop ou outros agentes**, `AGENTS.md` descreve o fluxo: os arquivos das skills são instruções consultáveis, mas seus comandos de barra **não são automaticamente instalados** em qualquer cliente.

## Procedimento de feature
1. Leia o GDD e a implementação existente, verificando o que já roda.
2. Defina uma história com critérios funcionais, regressão e visual.
3. Separe design, lógica autoritativa, apresentação e entrada do jogador.
4. Edite em branch; teste lógica e build; obtenha evidência de execução real quando interface/visual mudar.
5. Documente o comportamento implementado, faça revisão via PR e registre limitações.

## Regras de contenção
- Não copiar assets/código de jogos comerciais; preservar propriedade intelectual.
- Não transformar sugestões de FSM ou Event Bus em migração total sem teste.
- Não tratar GitHub Pages como hospedagem de servidor WebSocket.
- Não atribuir a IA um teste humano que não ocorreu.
- Sem atalhos A/S/D para magia do modo Praticar: só **segurar Z e soltar**.
- Não tocar no Slimekeepers por associação indireta com ferramentas de desenvolvimento de jogos.

## Referências e atribuição
Referência conceitual: Claude Code Game Studios, © Donchitos (2026), licença MIT. Este conjunto de nove skills é uma adaptação **original e reduzida** escrita para Re:Dream, não uma redistribuição integral dos 74 comandos. Para copiar código ou arquivos textuais significativos da origem, conservar o aviso da licença MIT.
