import type { PracticeImpact } from './protocol';

/** Visual-only, deterministic hit effects derived from confirmed simulation facts.
 * No timers, random numbers, Phaser APIs, network, or gameplay authority here.
 */
export type VfxLine = { x1:number; y1:number; x2:number; y2:number; width:number; color:number; alpha:number };
export type VfxRing = { x:number; y:number; radius:number; color:number; width:number; alpha:number };
export type VfxSpark = { x:number; y:number; size:number; color:number; alpha:number };
export type CombatVfxFrame = { duration:number; rings:VfxRing[]; rays:VfxLine[]; sparks:VfxSpark[] };

const PALETTE = {
  basic:0xffdba0, air:0xeec4ff, dash:0x95f5e1, launcher:0xa8ffd5,
  dive:0x9fdcff, otto:0xffd5a2,
} as const;

export function impactColor(impact:Pick<PracticeImpact,'kind'|'skillLevel'>):number {
  if(impact.kind==='skill') return impact.skillLevel===3?0xe3aeff:
    impact.skillLevel===2?0x95dfff:0x99f3c7;
  return PALETTE[impact.kind];
}

export function buildCombatVfx(
  impact:PracticeImpact, elapsedMs:number, reducedMotion=false,
):CombatVfxFrame {
  const duration=reducedMotion?110:impact.kind==='skill'?420:290;
  const elapsed=Math.max(0,elapsedMs);
  if (elapsed>=duration) return {duration,rings:[],rays:[],sparks:[]};
  const t=Math.min(1,elapsed/duration), fade=(1-t)*(1-t);
  const level=impact.kind==='skill'?Math.max(1,Math.min(3,impact.skillLevel??1)):0;
  const scale=1+level*.46+(impact.kind==='launcher'?.25:0);
  const color=impactColor(impact);
  const rings:VfxRing[]=[{
    x:impact.x,y:impact.y,radius:9+44*scale*t,
    color,width:Math.max(.7,(level?5:4)*(1-t*.7)),alpha:fade*.83,
  }];
  if(level>=2&&!reducedMotion) rings.push({
    x:impact.x,y:impact.y,radius:5+27*scale*t,
    color:0xffffff,width:2,alpha:fade*.55,
  });
  const rays:VfxLine[]=[];
  const sparks:VfxSpark[]=[];
  if(!reducedMotion) {
    const count=level?6+level*4:8;
    const stagger=(impact.sequence%7)*.17;
    for(let i=0;i<count;i++){
      const angle=Math.PI*2*i/count+stagger;
      const reach=(16+53*t)*(1+level*.21);
      const inner=reach-9*(1-t*.55);
      const dx=Math.cos(angle),dy=Math.sin(angle);
      rays.push({
        x1:impact.x+dx*inner,y1:impact.y+dy*inner*.8,
        x2:impact.x+dx*reach,y2:impact.y+dy*reach*.8,
        width:level?2.8+level*.45:2.7,
        color:i%4===0?0xffffff:color,alpha:fade*(i%4===0?.95:.68),
      });
      if(i%2===0) sparks.push({
        x:impact.x+dx*reach*1.05,
        y:impact.y+dy*reach*.85,
        size:(level?2.4+level*.55:2.7)*(1-.6*t),
        color:i%4===0?0xffffff:color,
        alpha:fade*.85,
      });
    }
  }
  return {duration,rings,rays,sparks};
}
