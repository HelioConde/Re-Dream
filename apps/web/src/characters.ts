import type { CharacterId } from './protocol';
export type CharacterDef = {
  id: CharacterId; name: string; subtitle: string; description: string;
  origin: string; preview: string; artSize: string;
};
export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'rose', name: "Guerreira das Rosas", subtitle: "Magia sombria",
    description: "Personagem ilustrada de teste. Corrigida a direção de caminhada; quadros de ataque e habilidade experimentais.", origin: "Arte original criada para o Re:Dream",
    preview: 'sprites/rose-hero-real.webp', artSize: '400% 200%' },
  { id: 'wanderer', name: "Viajante", subtitle: "Explorador",
    description: "Oito quadros autênticos para caminhar à esquerda e à direita, sem espelhamento.", origin: "char free.zip; licença original pendente de confirmação comercial",
    preview: 'sprites/imported/char/right.png', artSize: '800% 100%' },
  { id: 'sprout', name: "Aventureiro Sprout", subtitle: "Pixel aventureiro",
    description: "Quatro direções do atlas Sprout Lands; quadros originais.", origin: "Sprout Lands Basic — Cup Nooble; teste não comercial",
    preview: 'sprites/imported/sprout/sprout-character.png', artSize: '1200% 1200%' },
  { id: 'bunny', name: "Coelho Guerreiro", subtitle: "Little Dreamyland",
    description: "Animações originais de parado, corrida e espada. Uso permitido apenas no protótipo não comercial.", origin: "Little Dreamyland Free — Starmixu & Utaskuas (créditos obrigatórios)",
    preview: 'sprites/prototype/bunny_idle_right.png', artSize: '500% 100%' },
  { id: 'retro', name: "Fazendeiro Retrô", subtitle: "SuperRetroRanch",
    description: "Idle e caminhada com três quadros; teste não comercial.", origin: "SuperRetroRanch Free Tier — Gif",
    preview: 'sprites/prototype/retro_idle_right.png', artSize: '100% 100%' },
  { id: 'retrohat', name: "Fazendeiro de Chapéu", subtitle: "SuperRetroRanch",
    description: "Variação com chapéu e caminhada de três quadros.", origin: "SuperRetroRanch Free Tier — Gif",
    preview: 'sprites/prototype/retrohat_idle_right.png', artSize: '100% 100%' },
  { id: 'mana_dapper', name: "Explorador Mana", subtitle: "Mana Seed",
    description: "Camadas originais do paper-doll montadas em uma pose estática. Animações em preparação.", origin: "Mana Seed Farmer Sprite Free Sample — Seliel the Shaper",
    preview: 'sprites/prototype/mana_dapper.png', artSize: '100% 100%' },
  { id: 'mana_bob', name: "Aventureira Mana", subtitle: "Mana Seed",
    description: "Variação de cabelo e vestuário sobre a mesma pose do paper-doll.", origin: "Mana Seed Farmer Sprite Free Sample — Seliel the Shaper",
    preview: 'sprites/prototype/mana_bob.png', artSize: '100% 100%' },
  { id: 'cat', name: "Gato", subtitle: "Animal de teste",
    description: "Avatar animal estático, sem quadros adicionais de caminhada.", origin: "Tiny Animals — Jedimei",
    preview: 'sprites/imported/animals/cat.png', artSize: '100% 100%' },
  { id: 'fox', name: "Raposa", subtitle: "Animal de teste",
    description: "Avatar animal estático, para brincar com amigos no multiplayer.", origin: "Tiny Animals — Jedimei",
    preview: 'sprites/imported/animals/fox.png', artSize: '100% 100%' },
  { id: 'rabbit', name: "Coelhinho", subtitle: "Animal de teste",
    description: "Avatar estático de coelho; diferente do guerreiro Bunny.", origin: "Tiny Animals — Jedimei",
    preview: 'sprites/imported/animals/rabbit.png', artSize: '100% 100%' },
  { id: 'wolf', name: "Lobo", subtitle: "Animal de teste",
    description: "Avatar de lobo, com pose estática.", origin: "Tiny Animals — Jedimei",
    preview: 'sprites/imported/animals/wolf.png', artSize: '100% 100%' },
  { id: 'panda', name: "Panda", subtitle: "Animal de teste",
    description: "Avatar de panda, sem animações originais.", origin: "Tiny Animals — Jedimei",
    preview: 'sprites/imported/animals/panda.png', artSize: '100% 100%' },
  { id: 'owl', name: "Coruja", subtitle: "Animal de teste",
    description: "Avatar de coruja, com pose estática.", origin: "Tiny Animals — Jedimei",
    preview: 'sprites/imported/animals/owl.png', artSize: '100% 100%' },
];
export function getCharacter(id: CharacterId | undefined): CharacterDef {
  return CHARACTERS.find(character => character.id === id) ?? CHARACTERS[0];
}
export function characterName(id: CharacterId | undefined): string {
  return getCharacter(id).name;
}
