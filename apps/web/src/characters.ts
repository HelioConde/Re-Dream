import type { CharacterId } from './protocol';

export type CharacterDef = {
  id: CharacterId; name: string; subtitle: string; description: string;
  origin: string; preview: string; artSize: string; previewPosition?: string;
};

export const CHARACTERS: readonly CharacterDef[] = [{
  id:'aren',
  name:'Aren',
  subtitle:'Buscador de Sonhos · Espadachim da Lua',
  description:'Novo protagonista original do Re:Dream. Capa teal e cabelo azul-noturno, espada de luz crescente. Animações vetoriais próprias: parado, caminhada, corrida, dash, salto, queda, Rocket/Shadow, quatro golpes, ataques aéreos, Otto, carga Z e magias MP1, MP2 e MP3.',
  origin:'Arte original Re:Dream — personagem procedimental construído do zero. Ficha conceitual é uma referência, não spritesheets extraídos de ilustrações.',
  preview:'art/aren/idle-0.svg',
  artSize:'100% 100%',
}] as const;

export function getCharacter(_id: CharacterId | undefined): CharacterDef {
  return CHARACTERS[0];
}
export function characterName(_id: CharacterId | undefined): string {
  return CHARACTERS[0].name;
}
