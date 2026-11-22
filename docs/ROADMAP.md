# Evolução de Eclipse Vanguard

## Etapa 1 — Fundamentos migrados de GameTeste para Re-Dream (Godot)
- [x] Projeto Godot abrindo uma cena principal.
- [x] Plataformas, colisões, movimento e salto.
- [x] Combo leve, golpe forte, dash e especial.
- [x] Inimigos com IA básica, dano e ondas.
- [x] Vida, energia, experiência e HUD.
- [x] Teste automatizado em GitHub Actions.

## Etapa 2 — Paridade de controles Re:Dream e qualidade do combate
- [ ] Ajustar hitstop, cancelamento de combo e janelas de esquiva.
- [x] Adicionar coyote time, jump buffer, dash por duplo toque e comando ↓ em plataformas one-way.
- [x] Adicionar ataques aéreos, launcher e ataque durante dash (cancelamento de dash para golpear).
- [x] Carga Z e magias MP1/MP2/MP3 por tempo segurado e energia disponível.
- [x] Portar combo de quatro golpes, Rocket Step, Shadow Step e salto de perseguição após launcher.
- [x] Portar Otto na borda, estocada aérea descendente e limite de 3 levantamentos de air-juggle por inimigo.
- [ ] Refinar juggles avançados, cancels e janela de prioridade de ↓ antes do ataque.
- [ ] Ampliar IA: alcance, prioridade, flanqueamento e antecipação de movimentos.
- [ ] Acrescentar efeitos sonoros, animações, partículas e feedback de impacto.
- [ ] Escrever testes de dano, colisão e recargas em Godot.
- [ ] Implementar câmera suave com regiões e arenas de combate.

## Etapa 3 — Identidade e fases
- [ ] Criar personagem original com sprite, animações e ficha de habilidades.
- [ ] Produzir conjuntos de cenários originais e 3 biomas.
- [ ] Introduzir fases completas com objetivos e checkpoints.
- [ ] Criar bosses com múltiplas fases de luta.
- [ ] Inserir menu, configurações, áudio e controles configuráveis.

## Etapa 4 — Profundidade
- [ ] Seleção e desbloqueio de personagens, cada um com estilo próprio.
- [ ] Equipamentos, talentos, itens e economia balanceada.
- [ ] Missões, mapas, progressão e salvamento.
- [ ] Suporte a controle e testes para acessibilidade.
- [ ] Avaliar cooperativo somente após combate local estabilizado.

## Critérios de cada entrega
1. Uma mudança pequena com propósito e teste reproduzível.
2. Compilação/importação sem erro no CI.
3. Nenhum asset protegido de Grand Chase ou de outros jogos.
4. Feedback visual e de jogabilidade documentado.
5. Preservar funcionalidades que já foram aprovadas.
