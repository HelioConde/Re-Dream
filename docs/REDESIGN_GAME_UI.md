# Re:Dream — Interface do cliente (recomeço visual)

Esta implementação cria uma interface original para o Re:Dream, inspirada na organização de jogos de ação 2D com seleção de heróis, mapa de missões, inventário, lobby e HUD, conforme as referências de design fornecidas. **Não copia** logotipo, personagens, itens, textos, mapas ou imagens proprietárias de Grand Chase.

## Jornada de navegação

1. **Abertura**: cena fantástica original em CSS, marca Re:Dream, botão Entrar.
2. **Portal**: prévia do Bosque dos Sonhos, Jogar Agora / Entrar com Código.
3. **Missões**: mapa original em SVG com quatro pontos, mas somente o Bosque dos Sonhos tem missão funcional.
4. **Inventário**: layout de paper-doll/slots e mochila como preview honesto, ainda sem itens ou transações reais.
5. **Seleção**: roster compacto de personagens provisórios presentes no repositório, incluindo créditos.
6. **Lobby**: salas WebSocket com até quatro participantes, escolha de personagem e início pelo host.
7. **Masmorra**: Phaser preservado, com HUD de HP e progresso da missão no overlay.

O servidor WebSocket e o gameplay foram preservados; nenhum armazenamento nem autenticação nova foi adicionado.

## Implementação

- apps/web/src/AdventureHub.tsx: telas de abertura, portal, mapa, inventário e navegação.
- apps/web/src/dream-ui.css: identidade visual, atmosfera original, layouts e responsividade.
- apps/web/src/CharacterSelect.tsx: textos ajustados ao novo fluxo.
- apps/web/src/App.tsx: integra o novo cliente ao fluxo existente de seleção, lobby e Phaser.
- apps/web/src/main.tsx: importa tema novo por último, para priorizar os estilos atualizados.

## Próximas entregas

- Substituir o roster provisório pelo Fighter original quando chegarem os sprites nativos do PixelLab.
- Criar sprites em camadas para manoplas/peitoral/botas e integrar equipamentos visuais reais.
- Integrar recursos de inventário a uma validação no servidor; não considerar localStorage fonte confiável para itens.
- Criar conteúdo próprio para outras regiões. Os marcadores Em breve são intencionalmente inativos.
- Adicionar ilustrações e FX originais ao novo ambiente, sem usar screenshots de referência como assets.

## Qualidade mínima

Executar npm test e npm run build na raiz. Verificar navegação por teclado, layout móvel, fluxo Entrar → Seleção → Lobby → Iniciar, conexão com Render, jogo com dois clientes e estado local do perfil.

## Luci e Modo Praticar

- O protagonista oficial é **Luci**, classe **Fighter**, e foi adicionado como primeira opção da seleção.
- O original permanece em **Anime_fantasy_action_RPG_playable.zip** na raiz do repo. A etapa CI "Prepare Luci animation spritesheets" extrai as animações Leste em spritesheets transparentes 128×128 e gera um manifesto, um preview do corpo e um preview da armadura.
- **Não regeneramos quadros**: cada imagem vem diretamente da exportação existente. Os estados disponíveis são o corpo Idle com animações e a armadura Fighter_Iniciante_01 com apenas poses estáticas.
- O Phaser usa animações de idle, corrida, pulo e quatro ataques originais do Luci; espelha Leste para Oeste.
- O botão "Praticar · offline" abre uma arena local com um alvo regenerativo, hitpoints, contador de golpes e comandos idênticos aos do modo multiplayer. Não usa Render, banco de dados, ranking, dinheiro ou recompensas.
- A física do treino foi recriada no cliente para testes; resultados do treino não são autoritativos e não afetam partidas.
- Em Windows, para testar localmente, instale Pillow com pip e execute python scripts/import_luci_sprites.py antes de npm run dev; no GitHub Actions a importação ocorre automaticamente.
- Animações equipadas e equipamentos modulares permanecem pendentes, não foram inventados ou substituídos por arte provisória.
