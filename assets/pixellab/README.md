# Sprites gerados pelo PixelLab

Esta pasta recebe **PNG RGBA reais gerados pela API PixelLab v2**. Não inserir sprites de outros jogos nem usar gerações independentes para cada quadro de animação.

## Convenção

- `assets/pixellab/hero/idle/000.png`: primeiro quadro, personagem virado à direita.
- `assets/pixellab/hero/run/000.png` etc.: frames de animação alinhados.
- `assets/pixellab/enemy/...`: sprites do adversário.
- `manifest.json` (por personagem): origem PixelLab, prompts, hashes, jobs e quantidade de quadros.

O jogo Godot detecta os PNGs e ativa animação automaticamente. Na ausência de sprites, continua usando os desenhos procedurais existentes.

## Gerar pelo GitHub Actions

1. Na conta PixelLab, obtenha um token de API em https://pixellab.ai/account.
2. No repositório abra **Settings → Secrets and variables → Actions → New repository secret**.
3. Crie o segredo **PIXELLAB_API_KEY**, com o token. Nunca cole a chave em commit ou conversa.
4. Em **Actions → PixelLab — gerar sprites e criar PR → Run workflow**, selecione `hero` ou `enemy`, escolha `core` ou `full`.
5. Primeiro use `generate=false` para simular gratuitamente. Para criar sprites reais selecione `generate=true`: **essa execução consome créditos do PixelLab**.
6. A Action salva os PNGs em um artefato, abre uma branch e tenta criar uma PR para revisão; o merge faz o Godot usar esses sprites na próxima publicação do Pages.

## Direção visual

- Jogo de plataformas 2D: personagem **de perfil, virado para a direita**; espelhado pelo Godot quando olhar para a esquerda.
- Sprites transparentes 96 × 96 como referência; quadros de movimento podem variar de tamanho, centrados pelo Godot.
- Hero: espadachim original, capa violeta, armadura azul-escura, espada de aço.
- Enemy: saqueador original, armadura cinza, espada curta.
- Manter paleta e proporções entre animações. Revisar poses, transparência e fidelidade antes do merge.

## Referências técnicas

- https://api.pixellab.ai/v2/docs
- https://www.pixellab.ai/docs/ways-to-use-pixellab

Não há geração no PixelLab sem o segredo e crédito; o modo de simulação apenas valida a integração.

## Novo protagonista mágico (V2)

O sprite anterior `hero/` continua íntegro como fallback, mas **não é a estética final**. O novo `vanguard/` usa um sprite-mestre original de 128×128, aparência anime de aventura, roupas claras, cachecol turquesa e magia lunar. Depois de revisar `vanguard/idle`, `vanguard/run` e `vanguard/attack` na PR, a Godot passa a preferir automaticamente esse conjunto.

Na Action manual selecione **character=vanguard**, **animation_set=core** e **generate=true** somente se quiser consumir créditos PixelLab. A etapa de simulação **generate=false** é gratuita. Veja `docs/ART_DIRECTION_VANGUARD_V2.md`. Nunca substituir a antiga arte sem revisão e rollback.
