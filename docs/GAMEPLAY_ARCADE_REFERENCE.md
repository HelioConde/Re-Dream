# Re:Dream — Direção de gameplay arcade 2D

## Referência e identidade

O objetivo é reproduzir **a sensação de jogo** de action-platformers 2D clássicos como Grand Chase Season 3, não seus personagens, sprites, mapas, trilhas, nomes de ataques ou código. Re:Dream usa seus próprios personagens (Luci é o Fighter protagonista) e mecânicas ajustadas por testes de jogabilidade.

## Primeira implementação: Campo de Prática offline

- Direção com setas: um toque mantém caminhada de 310 px/s; **duplo toque em até 290 ms** ativa um dash de 240 ms a 685 px/s. Se a segunda pressão continuar segurada, o dash termina em uma **corrida contínua** de 455 px/s. Soltar a direção encerra a corrida; inverter a direção cancela o movimento.
- Salto em ↑ (W alternativo no treino); janela curta para aceitar saltos no momento certo.
- Descer de uma plataforma vazada **pressionando ↓ sozinho** (toque breve ou segurando). Há 120 ms de prioridade de comandos para permitir ↓+Z/J executar Otto/ataque em vez de queda. ↓+Espaço continua opcional como descida imediata; jamais atravessa o chão sólido.
- **J:** sequência de golpes com escala de dano e quatro estágios de animação. Manter J pressionado também funciona como opção acessível.
- **Ataque no ar:** usa a animação real de ataque aéreo e acerta o alvo quando próximo.
- **↑ + J/Z no meio de um combo em solo:** executa golpe ascendente com a spritesheet autêntica `uppercut_east` e lança o alvo para cima; ↑ sozinho continua pulando.
- **↓ + J/Z durante o salto:** estocada descendente. Acelera o Luci para o solo e só acerta se as áreas de ataque realmente se sobrepõem. A descida atravessa plataformas finas, mas nunca o chão sólido. Usa a animação aérea autoral do Luci com efeito de rastro, sem inventar quadros.
- O alvo lançado tem gravidade e posição vertical reais durante o treinamento, podendo ser perseguido no ar.
- **Perseguição após o lançamento:** solte ↑ depois do uppercut e pressione ↑ novamente em até 550 ms para cancelar a recuperação e saltar mais alto. Um indicador contextual `↑ PERSEGUIR` aparece enquanto a janela está ativa.
- **Juggle aéreo:** ao alcançar o boneco lançado, acerte J no ar. O primeiro ao quarto golpe aéreo bem-sucedido renovam brevemente a altura do alvo, com gravidade e hitbox reais; o quinto não gera um repique infinito. O HUD registra a sequência aérea atual e o melhor resultado.
- **Finalização:** ↓ + J durante o salto pode arremessar o boneco lançado de volta para o chão. Só ocorre dano quando a estocada realmente encosta no alvo.

- **Ataque durante o dash:** utiliza a spritesheet real de dash attack do Luci.
- **Z:** o primeiro golpe sai imediatamente ao pressionar; segurar 0,65 / 1,30 / 1,95 segundo(s) carrega magia nível 1/2/3. **Só soltar Z dispara a habilidade**, se houver MP (100/200/300 pontos). Soltar Z rapidamente não duplica o golpe.
- **Sem atalhos de magia:** A, S, D e K não conjuram no treino; também não há botões MP instantâneos no celular. MP inicial 100; acertos restauram MP.
- O alvo de treino mantém a colisão fixa, mas recua visualmente ao receber dano. Indicadores de dano e centelhas só aparecem em golpes confirmados, com efeitos reduzidos ao respeitar a preferência do sistema por menos movimento.
- Golpes inseridos até 170 ms antes de ficarem disponíveis são armazenados em um pequeno buffer para evitar perder sequências rápidas.
- O alvo tem 260 HP e retorna após a derrota.
- Resultados e indicadores são locais; não há progressão permanente nem recompensas reais.

## Controles clássicos adaptados (V5 — modo Praticar)

A configuração principal é baseada em **setas + Z**. **A, S e D não ativam habilidades**; no treino não existem teclas ou botões para conjuração instantânea. Somente manter Z pressionado e soltá-lo libera uma magia carregada. O modo cooperativo mantém seus controles anteriores até migrarmos suas regras.

| Ação | Teclado |
| --- | --- |
| Andar | ← ou → |
| Dash | ←← ou →→ (duplo toque rápido) |
| Corrida após dash | Manter pressionada a **segunda** seta (← ou →) depois do dash; soltar interrompe a corrida |
| Rocket Step | Dash + ↑ (mantém impulso horizontal no ar por janela limitada) |
| Shadow Step | Rocket Step + ↓ durante o voo (encurta o salto) |
| Dash Cancel | Direção oposta ao dash |
| Pular | ↑; W como alternativa |
| Descer plataforma vazada | ↓ sozinho, inclusive toque breve, em plataforma fina (↓ + Espaço é opcional para descida imediata) |
| Otto adaptado | ↓ + Z na borda de plataforma vazada; golpe descendente com colisão |
| Ataque básico e carregamento | Z; J é alternativa para ataque sem carga |
| MP1, MP2, MP3 | Segurar Z por 0,65 s / 1,30 s / 1,95 s, soltar e consumir 1/2/3 barras |
| Atalhos MP | **Inexistentes** — apenas segurar e soltar Z |
| Launcher e perseguição | ↑+Z no combo, soltar ↑ e pressionar de novo |
| Estocada aérea | ↓+Z durante o salto |

**MP:** são três reservas visíveis de 100 pontos cada (300 total); ataques recuperam MP. Carga em Z não executa habilidades sem MP suficiente; pressionar Z faz o primeiro ataque imediatamente e não repete automaticamente enquanto se mantém pressionado. Habilidades usam a spritesheet autoral disponível com efeitos ajustados ao nível; não há três animações totalmente distintas ainda.

**Escopo não implementado:** inventário/itens no X/Espaço, provocações, AP, troca de arma, agarrão, contra-ataque e passos avançados específicos de classe. Otto é uma adaptação jogável inicial, não uma reprodução exata de cadências ou glitches históricos.

### QA manual adicional
- Dash → ↑: contar Rocket; soltar direção e verificar que conserva brevemente o impulso no ar.
- Durante Rocket, ↓: acelerar a queda, contar Shadow; aterrissar no chão sólido sem atravessá-lo.
- Dash → direção oposta: interromper dash, contador CANCEL aumenta.
- Apertar → uma vez e segurar: caminhar, sem dash nem corrida. Apertar → → e segurar a segunda pressão: dar dash e continuar correndo. Soltar → durante o dash: ele termina sem entrar em corrida. Soltar → depois da transição: parar imediatamente. Mudar para ← cancela a corrida.
- No treino do Luci, conferir sprites diferentes de caminhada, corrida e dash, incluindo direção esquerda por espelhamento. Rocket Step deve continuar iniciando durante o dash sem disparar corrida automática durante o voo.
- Subir em plataforma fina, dar um toque breve em ↓ e soltar: atravessar a plataforma. O botão ↓ de celular faz a mesma ação; não há mais um botão separado ↓+Espaço.
- Sobre a plataforma, ↓+Z/J imediatamente ou dentro de 120 ms: Otto na borda/ataque em solo deve ter prioridade; sem cair por engano.
- ↓ no chão sólido não atravessa nem teleporta. ↓ enquanto está no ar não deve provocar uma segunda queda automática ao pousar; ↓ no Rocket continua Shadow Step.
- ↓+Espaço continua como alternativa de descida imediata no teclado, sem se tornar obrigatório.
- Z curto acerta; Z segurado permite escolher nível 1, 2 ou 3; com MP suficiente, soltar consome 100/200/300. A/S/D/K não devem conjurar, nem deve existir botão MP1/2/3 no celular.
- O multiplayer mantém os controles anteriores enquanto o sistema de habilidades carregadas exclusivamente com Z não for integrado ao servidor autoritativo.

## Limites atuais

Esta etapa é **prototipagem offline**, não um clone concluído. As novas regras ainda não foram migradas ao servidor cooperativo, que mantém seus comandos e física atuais para não quebrar partidas. As animações de Luci aproveitam os quadros originais do PixelLab; não são quadros inventados. Outros personagens ainda usam pacotes temporários.

Próximas etapas, em ordem:
1. Coletar feedback de aceleração, dash, alcance, cancels e tempo entre golpes com o modo Praticar.
2. Criar golpes com janelas de acerto e cancelamento/recuperação, impacto e feedback visual mais legíveis.
3. Implementar as mesmas regras no servidor autoritativo e ajustar predição/reconciliação, com testes de rede.
4. Adicionar inimigos com telegraph, reação a dano e missões com plataformas, obstáculos e ondas.
5. Criar classes e animações autorais e verificar licenças dos sprites antes do uso comercial.

## Checklist de teste manual

1. Abrir /Re-Dream/#personagens, escolher Luci e clicar em **Praticar offline**.
2. Apertar →, soltar, apertar → novamente rapidamente: o contador de dash deve aumentar. **Manter a segunda pressão** deve iniciar corrida contínua após o dash, incrementando CORRIDAS; soltar deve parar.
2a. Pressionar Z uma vez perto do alvo: o primeiro impacto deve ocorrer antes de soltar. Soltar rapidamente não deve gerar segundo golpe.
3. Subir numa plataforma e apertar ↓ **sozinho** (mesmo toque breve): atravessar a plataforma sem atravessar o chão. Testar ↓+Z na borda como Otto e ↓ no ar como Shadow Step.
4. Chegar perto do boneco e atacar 3-4 vezes: contador de combo e danos devem progredir.
5. Pular perto do alvo e atacar: contador de ataques aéreos deve aumentar.
5a. Aproximar do boneco, J e depois ↑+J; ao surgir o indicador, soltar ↑ e apertar ↑ de novo para perseguir. Atacar com J no ar e conferir o contador JUGGLES.
5b. Deixar o alvo cair: o contador da sequência aérea deve zerar, sem perder o recorde.
5c. Após lançar e perseguir, ↓+J no ar deve finalizar o alvo em direção ao solo, sem acertar um alvo distante.

6. Segurar Z por 0,65 / 1,30 / 1,95 segundos, soltar: cada nível deve consumir a quantidade correta de MP. Apertar A/S/D/K não deve executar magia.
7. Pausar durante uma carga de Z, continuar: não deve soltar habilidade sozinha.
8. Testar 390 px de largura: controles móveis e medidores devem estar visíveis sem overflow.

**Observação:** nenhum jogo pode ser declarado "igual" apenas com testes unitários. A qualidade do movimento e do combate exige avaliação humana do controle e das animações na própria versão jogável.
