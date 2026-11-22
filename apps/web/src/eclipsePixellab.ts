import type { ArenAction } from './arenAnimation';

// Vite bundles real PixelLab PNGs only when they are in the asset directory.
// Node test runners do not expose Vite's import.meta.glob macro.
const images: Record<string, string> = typeof import.meta.glob === 'function'
  ? import.meta.glob<string>('./assets/pixellab/hero/*/*.png', { eager: true, query: '?url', import: 'default' })
  : {};

type SpriteFamily = 'idle' | 'run' | 'attack';
type Frame = { index: number; key: string; url: string };
const frames: Record<SpriteFamily, Frame[]> = { idle: [], run: [], attack: [] };

for (const [path, url] of Object.entries(images)) {
  const match = /\/hero\/(idle|run|attack)\/(\d{3})\.png$/.exec(path);
  if (!match) continue;
  const family = match[1] as SpriteFamily;
  const index = Number(match[2]);
  frames[family].push({ index, key: 'pixellab-hero-' + family + '-' + index, url });
}
for (const family of Object.keys(frames) as SpriteFamily[]) frames[family].sort((a, b) => a.index - b.index);

export const eclipseHeroTextures: Readonly<Record<string, string>> =
  Object.fromEntries(Object.values(frames).flat().map(({ key, url }) => [key, url]));
export const eclipseHeroPreviewUrl: string | null = frames.idle[0]?.url ?? null;

export function selectEclipseHeroTexture(
  action: ArenAction, actionAgeMs: number, attackElapsedMs?: number | null,
): string | null {
  const family: SpriteFamily | null = action === 'idle' || action === 'land' ? 'idle'
    : ['walk', 'run', 'dash'].includes(action) ? 'run'
    : action.startsWith('attack_') || ['dash_attack', 'air_attack'].includes(action) ? 'attack'
    : null;
  if (!family || frames[family].length === 0) return null;
  const elapsed = Math.max(0, family === 'attack' ? attackElapsedMs ?? actionAgeMs : actionAgeMs);
  const available = frames[family];
  const index = family === 'idle' ? 0 : family === 'attack'
    ? Math.min(available.length - 1, Math.floor(elapsed / 330 * available.length))
    : Math.floor(elapsed * (action === 'run' || action === 'dash' ? 15 : 11) / 1000) % available.length;
  return available[index]?.key ?? null;
}
