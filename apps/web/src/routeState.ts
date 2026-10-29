export type StandaloneRoute = 'practice' | 'characters' | 'landing';

// Keep hash-based navigation in sync with the offline training scene.
// Static GitHub Pages serves the same document for all three states.
export function resolveStandaloneRoute(hash: string): StandaloneRoute {
  if (hash === '#praticar') return 'practice';
  if (hash === '#personagens') return 'characters';
  return 'landing';
}
