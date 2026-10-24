import type { CharacterId } from './protocol';

export type CharacterDef = {
  id: CharacterId;
  name: string;
  subtitle: string;
  description: string;
  origin: string;
  preview: string;
  artSize: string;
};

export const CHARACTERS: readonly CharacterDef[] = [
  {
    id: 'rose', name: 'Guerreira das Rosas', subtitle: 'Magia sombria',
    description: 'Uma aventureira misteriosa. Protótipo visual com quadros de repouso, movimento e golpe.',
    origin: 'Arte ilustrada criada para Re:Dream',
    preview: 'sprites/rose-hero-real.webp', artSize: '400% 200%',
  },
  {
    id: 'wanderer', name: 'Viajante', subtitle: 'Explorador',
    description: 'Caminhada original para os dois lados, com oito quadros por direção.',
    origin: 'Personagem do pacote char free.zip',
    preview: 'sprites/imported/char/right.png', artSize: '800% 100%',
  },
];

export function characterName(id: CharacterId | undefined): string {
  return CHARACTERS.find(character => character.id === id)?.name ?? CHARACTERS[0].name;
}
