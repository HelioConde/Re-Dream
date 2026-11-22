import type { CharacterId } from './protocol';

export type CharacterDef = {
  id: CharacterId; name: string; subtitle: string; description: string;
  origin: string; preview: string; artSize: string; previewPosition?: string;
};

export const CHARACTERS: readonly CharacterDef[] = [{
  id:'aren',
  name:'Aren',
  subtitle:'Espadachim da Vanguarda · Guardião Lunar',
  description:'Herói original do Eclipse Vanguard. Sprites PixelLab para repouso, corrida e ataques; as outras 23 ações de movimentação e combate permanecem com animações autorais anteriores até receberem novos sprites.',
  origin:'Arte original Eclipse Vanguard. PNGs PixelLab importados do protótipo autoral GameTeste com hashes verificados; animações SVG anteriores mantidas como fallback. Sem copiar sprites de franquias externas.',
  preview:'art/aren/idle-0.svg',
  artSize:'100% 100%',
}] as const;

export function getCharacter(_id: CharacterId | undefined): CharacterDef {
  return CHARACTERS[0];
}
export function characterName(_id: CharacterId | undefined): string {
  return CHARACTERS[0].name;
}
