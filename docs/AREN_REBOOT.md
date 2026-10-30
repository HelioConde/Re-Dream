# Re:Dream — Aren, reboot do protagonista (2026-10-30)

## Resultado implementado
Aren, **Buscador de Sonhos**, é o novo e único personagem selecionável no cliente e no servidor desta versão. O elenco anterior foi retirado de `characters.ts`, `protocol.ts`, `apps/server/src/sim.ts`, `GameCanvas.tsx` e dos recursos rastreados de `apps/web/public/sprites/`. Git preserva o histórico para eventual recuperação, mas o jogo não usa mais os sprites antigos. Perfis locais com ID antigo são convertidos para `aren`.

**Visual:** o conceito de Aren, de cabelo azul-noturno, cachecol/capa verde-azulada, detalhes de lua/cristal e espada de energia é adaptado em desenho **vetorial procedimental** próprio, sem extrair quadros falsos da ficha conceitual. São **151 imagens SVG transparentes individuais, organizadas em 23 ações**, geradas deterministicamente em `scripts/generate_aren_art.mjs`, com poses diferentes ao longo de cada ação.

| Família | Estados animados |
| --- | --- |
| Locomoção | `idle`, `walk`, `run`, `dash` |
| Ar/plataformas | `rise`, `fall`, `rocket`, `shadow`, `land` |
| Combate | `attack_1`, `attack_2`, `attack_3`, `attack_4`, `dash_attack`, `air_attack`, `launcher`, `dive`, `otto` |
| Magia | `charge`, `skill_1`, `skill_2`, `skill_3` |
| Reação | `hurt` |

As poses e os efeitos foram desenhados em SVG por código original com variação de membros, corpo, capa, pernas e ângulos de espada. Não são uma única imagem estática disfarçada de animação. O mapeamento central `arenAnimation.ts` usa estados reais da simulação offline e informação de golpes; o multiplayer mantém seu movimento autoritativo atual.

## Jogabilidade preservada
- ←/→ caminhar; duplo toque dash; manter a segunda seta permite corrida contínua.
- ↑ pula; ↓ sozinho atravessa plataformas vazadas; não atravessa chão sólido.
- Rocket Step, Shadow Step, cancelamento de dash, quatro golpes, launcher, aéreo, dive e Otto preservados.
- **Z segurado e solto** lança os níveis MP1/2/3 no treino; A/S/D/K não são atalhos de magia. A animação de carga segue a tecla Z; a simulação decide gasto/colisão.

## Como executar
```bash
npm install
npm test
npm run build
```
O teste e o build do workspace web rodam `node ../../scripts/generate_aren_art.mjs` antes de ler os SVGs. Em desenvolvimento, os arquivos são produzidos pela primeira execução de `npm test`, `npm run build` ou diretamente `node scripts/generate_aren_art.mjs`. Os SVGs gerados não precisam ser mantidos manualmente no Git; o pipeline do GitHub Pages os gera e inclui na publicação.

## Compatibilidade online durante migração
O ID `aren` é aceito pelo **servidor na nova versão do repositório**, mas GitHub Pages não atualiza o serviço WebSocket remoto. Até a atualização separada do Render, o cliente tenta entrar com `aren` e, **apenas se o servidor antigo responder "Personagem inválido."**, envia o identificador antigo `luci` uma vez, apenas para compatibilidade de protocolo. A interface e o modelo visual continuam mostrando **somente Aren**. Após publicar o servidor novo, esse fallback poderá ser excluído. Não há alteração do servidor hospedado apenas por publicar esta PR.

## Limitações honestas / próxima etapa artística
Aren agora tem quadros distintos para todos os estados listados e aparece em seleção, hub, treino e partidas no cliente. **Isso não significa que ele já tenha a qualidade de pintura e fluidez quadro a quadro do concept art aprovado.** A ilustração conceitual inclui detalhes muito mais ricos do que as formas vetoriais de jogo; ainda é preciso produzir sprites 2D ilustrados profissionalmente, quadros intermediários consistentes e atlas otimizado. Outros inimigos e a floresta ainda são vetoriais. O jogo ainda exige QA visual e de *game feel* em desktop/mobile, que testes unitários não comprovam.

## Critérios de aceite
- Apenas `aren` selecionável; IDs antigos rejeitados pelo servidor atualizado.
- 23 estados e 151 SVGs distintos gerados sem dependências externas; nenhuma imagem de franquia comercial.
- Seleção de estado e quadros corretos para walk/run/dash, salto/queda, Rocket/Shadow, combo 1–4, Otto, charge Z e MP 1–3.
- Testes de física, plataformas, eventos e WebSocket preservados, build e deploy verde.
- Inspeção real de navegador e captura de tela pendentes, sem alegar conclusão visual antecipada.

## Referência artística
A ficha conceitual de Aren criada na conversa é **a meta visual**, não um atlas técnico. Um futuro spritesheet final deverá manter silhueta, pivot dos pés, proporções e marcações visuais consistentes em todos os quadros.
