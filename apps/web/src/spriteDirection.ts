/** No horizontal flipping when artist provided distinct facing GIF animations. */
export function directionalFrame(facing: number, walking: boolean, elapsedMs: number) {
  const texture = facing < 0 ? 'hero-left' : 'hero-right';
  const frame = walking ? Math.floor(Math.max(elapsedMs, 0) / 105) % 8 : 0;
  return { texture, frame, flipX: false } as const;
}
