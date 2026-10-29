# Re:Dream — Direção de gameplay arcade 2D

## Referência e identidade

O objetivo é reproduzir **a sensação de jogo** de action-platformers 2D clássicos como Grand Chase Season 3, não seus personagens, sprites, mapas, trilhas, nomes de ataques ou código. Re:Dream usa seus próprios personagens (Luci é o Fighter protagonista) e mecânicas ajustadas por testes de jogabilidade.

## Primeira implementação: Campo de Prática offline

- Direção com setas ou A/D; **duplo toque em uma direção** em até 290 ms ativa um dash de 240 ms.
- Salto em ↑, W ou Espaço; janela curta para aceitar saltos no momento certo.
- Descer da plataforma com ↓ ou S, sem atravessar o chão sólido.
- **J:** sequência de golpes com escala de dano e quatro estágios de animação. Manter J pressionado também funciona como opção acessível.
- **Ataque no ar:** usa a animação real de ataque aéreo e acerta o alvo quando próximo.
- **Ataque durante o dash:** utiliza a spritesheet real de dash attack do Luci.
- **Z:** o primeiro golpe sai imediatamente ao pressionar; segurar por 650 ms e soltar adiciona a habilidade carregada se houver 35 MP. Soltar Z rapidamente não duplica o golpe.
- **K/X:** habilidade instantânea se houver MP. MP inicial 40; acertos restauram MP.
- O alvo de treino mantém a colisão fixa, mas recua visualmente ao receber dano. Indicadores de dano e centelhas só aparecem em golpes confirmados, com efeitos reduzidos ao respeitar a preferência do sistema por menos movimento.
- Golpes inseridos até 170 ms antes de ficarem disponíveis são armazenados em um pequeno buffer para evitar perder sequências rápidas.
- O alvo tem 260 HP e retorna após a derrota.
- Resultados e indicadores são locais; não há progressão permanente nem recompensas reais.

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
2. Apertar →, soltar, apertar → novamente rapidamente: o contador de dash deve aumentar.
2a. Pressionar Z uma vez perto do alvo: o primeiro impacto deve ocorrer antes de soltar. Soltar rapidamente não deve gerar segundo golpe.
3. Subir numa plataforma e apertar ↓: atravessar a plataforma sem atravessar o chão.
4. Chegar perto do boneco e atacar 3-4 vezes: contador de combo e danos devem progredir.
5. Pular perto do alvo e atacar: contador de ataques aéreos deve aumentar.
6. Pressionar e segurar Z até carga cheia, soltar: habilidade deve consumir MP.
7. Pausar durante uma carga de Z, continuar: não deve soltar habilidade sozinha.
8. Testar 390 px de largura: controles móveis e medidores devem estar visíveis sem overflow.

**Observação:** nenhum jogo pode ser declarado "igual" apenas com testes unitários. A qualidade do movimento e do combate exige avaliação humana do controle e das animações na própria versão jogável.
