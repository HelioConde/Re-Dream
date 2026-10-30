// Original Re:Dream hero: deterministic procedural 2D animation frames.
// Generates real, distinct transparent SVG poses. No downloaded/third-party art.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AREN_FRAMES = {
  idle: 6, walk: 8, run: 8, dash: 6,
  rise: 4, fall: 4, rocket: 6, shadow: 5, land: 5,
  attack_1: 7, attack_2: 7, attack_3: 7, attack_4: 8,
  dash_attack: 7, air_attack: 7, launcher: 7, dive: 7, otto: 7,
  charge: 6, skill_1: 8, skill_2: 8, skill_3: 8, hurt: 5,
};

const round = n => Math.round(n * 10) / 10;
const path = (d,fill,extra='') => '<path d="' + d + '" fill="' + fill + '" ' + extra + '/>';
const line = (x1,y1,x2,y2,stroke,width) =>
  '<path d="M' + round(x1) + ' ' + round(y1) + 'L' + round(x2) + ' ' + round(y2) +
  '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round" fill="none"/>';
const circle = (x,y,r,fill,extra='') =>
  '<circle cx="' + round(x) + '" cy="' + round(y) + '" r="' + round(r) + '" fill="' + fill + '" ' + extra + '/>';

/**
 * Hand-authored attack keys: every attack uses a different lean, footing,
 * weapon path and cape reaction, not the same generic sine-wave sword pose.
 * Values animate between anticipation, contact and recovery within each sheet.
 */
export const AREN_STRIKES = Object.freeze({
  attack_1: { lean:12, stride:24, arm:-36, start:-64, end:42, length:55, cape:18, lift:0, color:'#9ef5d9' },
  attack_2: { lean:19, stride:32, arm:32, start:62, end:-67, length:66, cape:26, lift:-2, color:'#9de9fc' },
  attack_3: { lean:-7, stride:-29, arm:-70, start:-82, end:18, length:63, cape:37, lift:-4, color:'#c6b8ff' },
  attack_4: { lean:27, stride:37, arm:72, start:-117, end:48, length:78, cape:50, lift:-7, color:'#ddfff2' },
  dash_attack: { lean:32, stride:36, arm:-45, start:-40, end:38, length:71, cape:57, lift:-4, color:'#b4f4e6' },
  air_attack: { lean:24, stride:27, arm:50, start:-114, end:72, length:66, cape:35, lift:-10, color:'#b2e5ff' },
  launcher: { lean:-13, stride:-9, arm:-88, start:69, end:-88, length:70, cape:29, lift:-3, color:'#b3fff2' },
  dive: { lean:38, stride:-24, arm:86, start:31, end:103, length:68, cape:46, lift:-13, color:'#a3d9ff' },
  otto: { lean:33, stride:-31, arm:67, start:21, end:112, length:58, cape:30, lift:-9, color:'#ffd8ae' },
});

export function arenStrikePose(state, phase) {
  const p=AREN_STRIKES[state];
  if (!p) return null;
  const t=Math.max(0,Math.min(1,phase));
  const impact=Math.sin(Math.PI*t);
  const eased=t*t*(3-2*t);
  return {
    lean:p.lean + (t-.5)*8,
    stride:p.stride*(.7+impact*.3),
    arm:p.arm + (t-.5)*23,
    scarfMotion:p.cape+impact*15,
    bodyY:p.lift - impact*2.5,
    bladeAngle:p.start+(p.end-p.start)*eased,
    bladeReach:p.length,
    arcColor:p.color,
    impact,
  };
}

export function drawArenFrame(state, index, frames=AREN_FRAMES[state]) {
  if (!frames || index < 0 || index >= frames) throw Error('Invalid Aren animation frame: '+state+'/'+index);
  const phase = index / frames, wave = Math.sin(phase*Math.PI*2), abs = Math.abs(wave);
  const attack = state.startsWith('attack_') || ['dash_attack','air_attack','launcher','dive','otto'].includes(state);
  const skill = state.startsWith('skill_');
  const air = ['rise','fall','rocket','shadow','air_attack','dive','otto'].includes(state);
  const fast = ['run','dash','rocket','dash_attack'].includes(state);
  let lean=0,bob=0,stride=0,arm=-7,scarfMotion=0,knee=0,bodyY=0;
  if(state==='idle'){bob=wave*1.5;scarfMotion=wave*6;arm=wave*4;}
  if(state==='walk'){bob=abs*2;stride=wave*28;arm=-wave*27;scarfMotion=13+wave*8;}
  if(state==='run'){lean=12;bob=abs*3;stride=wave*43;arm=-wave*41;scarfMotion=32+wave*13;knee=13;}
  if(state==='dash'){lean=24;bob=2;stride=20+wave*8;arm=-60;scarfMotion=44+wave*9;knee=18;}
  if(state==='rise'){bodyY=-8;lean=-4;stride=17;arm=-43;scarfMotion=11;}
  if(state==='fall'){bodyY=-4;stride=-12;arm=36;scarfMotion=22;}
  if(state==='rocket'){bodyY=-7;lean=29;stride=25;arm=-60;scarfMotion=52;}
  if(state==='shadow'){bodyY=-5;lean=-16;stride=-18;arm=57;scarfMotion=28;}
  if(state==='land'){bob=6*(1-phase);knee=30*(1-phase);lean=9*(1-phase);scarfMotion=18;}
  if(state==='hurt'){lean=-16*(1-phase);bob=-4;stride=-10;arm=38;scarfMotion=20;}
  const strikePose=attack?arenStrikePose(state,phase):null;
  if(strikePose){
    lean=strikePose.lean; bob=-2; stride=strikePose.stride;
    arm=strikePose.arm; scarfMotion=strikePose.scarfMotion;
    bodyY=strikePose.bodyY;
  }
  if(state==='charge'){arm=-62;scarfMotion=14+wave*7;bob=wave;}
  if(skill){arm=-55+wave*10;lean=4;bob=-2;scarfMotion=36+wave*10;stride=7;}
  const color = {outline:'#13283b',coat:'#e9e6d9',shadow:'#9fa8b2',cloth:'#203c4e',
    cape:'#226476',capeLight:'#64d2b9',metal:'#b9b7a2',skin:'#f2ccb0',skinShadow:'#d49d89',
    hair:'#233547',hairLight:'#4e6570',glow:'#9bfce0',boot:'#233647'};
  const hipY=120+knee*.28, headY=50+bob, coreX=97+lean*.33;
  const leg = (side, swing) => {
    const hipX=coreX+side*11, hip=hipY;
    const angle=swing*Math.PI/180;
    const bend=(state==='run'?25:state==='walk'?8:knee)*Math.PI/180;
    const kx=hipX+Math.sin(angle)*30,ky=hip+Math.cos(angle)*30;
    const footx=kx+Math.sin(-angle*.5+bend*(side>0?1:-1))*29;
    const footy=ky+Math.cos(-angle*.5+bend*(side>0?1:-1))*29;
    return [
      line(hipX,hip,kx,ky,color.outline,18),
      line(hipX,hip,kx,ky,side>0?'#364858':'#182e3f',13),
      circle(kx,ky,9,color.metal),
      line(kx,ky,footx,footy,color.outline,17),
      line(kx,ky,footx,footy,'#324f60',12),
      '<path d="M'+round(footx-8)+' '+round(footy-3)+' q16 3 22 8 l-1 7 q-11 3 -29 -1z" fill="'+color.boot+'" stroke="'+color.outline+'" stroke-width="3"/>',
      line(footx-3,footy+2,footx+8,footy+4,color.capeLight,2),
    ].join('');
  };
  const backLeg=leg(-1,-stride),frontLeg=leg(1,stride);
  const capeTipX=25-scarfMotion*.55, capeTipY=110+wave*5-(fast?12:0);
  const cape=path('M'+round(coreX-11)+' 64 Q'+round(coreX-39)+' 68 '+round(capeTipX)+' '+round(capeTipY-24)+
    'Q'+round(capeTipX-8)+' '+round(capeTipY)+' '+round(capeTipX+20)+' '+round(capeTipY+7)+
    'L'+round(coreX-4)+' 111Z',color.cape,
    'stroke="'+color.outline+'" stroke-width="4" stroke-linejoin="round"')+
    path('M'+round(coreX-12)+' 75 Q'+round(capeTipX+9)+' '+round(capeTipY-13)+' '+round(capeTipX+19)+
    ' '+round(capeTipY)+' Q'+round(coreX-46)+' 93 '+round(coreX-7)+' 91Z','#3c8c86',
    'opacity=".8"')+
    line(capeTipX+15,capeTipY-2,capeTipX+23,capeTipY+3,color.glow,2.5);
  const backArmX=coreX-18, backArmY=81;
  const backElbowX=backArmX-12-arm*.16, backElbowY=105+arm*.06;
  const backHandX=backElbowX-5-arm*.09, backHandY=128+arm*.07;
  const backArm=line(backArmX,backArmY,backElbowX,backElbowY,color.outline,17)+
    line(backArmX,backArmY,backElbowX,backElbowY,color.coat,12)+
    line(backElbowX,backElbowY,backHandX,backHandY,color.outline,14)+
    line(backElbowX,backElbowY,backHandX,backHandY,color.metal,9)+
    circle(backHandX,backHandY,7,color.boot);
  const mainShoulderX=coreX+17, mainShoulderY=82;
  // The forearm follows the dedicated key pose; previously every combo shared one wave.
  const swingArm=arm;
  let mainElbowX=mainShoulderX+12+swingArm*.48,mainElbowY=102-swingArm*.24;
  let mainHandX=mainElbowX+9+swingArm*.35,mainHandY=122-swingArm*.36;
  if(state==='charge'||skill){mainHandX=coreX+28;mainHandY=61+wave*3;mainElbowX=coreX+29;mainElbowY=85;}
  if(state==='launcher'){mainHandX=coreX+26;mainHandY=38;mainElbowX=coreX+25;mainElbowY=66;}
  if(state==='dive'||state==='otto'){mainHandX=coreX+50;mainHandY=135;mainElbowX=coreX+29;mainElbowY=100;}
  const frontArm=line(mainShoulderX,mainShoulderY,mainElbowX,mainElbowY,color.outline,19)+
    line(mainShoulderX,mainShoulderY,mainElbowX,mainElbowY,color.coat,13)+
    line(mainElbowX,mainElbowY,mainHandX,mainHandY,color.outline,15)+
    line(mainElbowX,mainElbowY,mainHandX,mainHandY,color.skin,10)+
    circle(mainElbowX,mainElbowY,6,color.metal)+
    circle(mainHandX,mainHandY,8,color.boot)+
    line(mainHandX-2,mainHandY-3,mainHandX+4,mainHandY-1,color.capeLight,2);
  const torso = '<path d="M'+round(coreX-22)+' 72 Q'+round(coreX)+' 63 '+round(coreX+23)+
    ' 75L'+round(coreX+20)+' 122Q'+round(coreX)+' 136 '+round(coreX-22)+' 119Z" fill="'+color.coat+
    '" stroke="'+color.outline+'" stroke-width="4"/>'+
    path('M'+round(coreX-17)+' 80 l19 0 12 29 -18 4z','#aec4c1','opacity=".7"')+
    path('M'+round(coreX-19)+' 111 L'+round(coreX+20)+' 113 L'+round(coreX+27)+' 125 L'+round(coreX-23)+' 124Z',
      '#253f51','stroke="'+color.outline+'" stroke-width="3"')+
    line(coreX-10,119,coreX+17,119,'#bdad87',4)+
    circle(coreX+2,119,6,color.metal)+
    path('M'+round(coreX+2)+' 113l5 7 -5 8 -5 -8z',color.glow)+
    path('M'+round(coreX-20)+' 70q-12 -11 3 -16l26 10q20 -13 27 5l-15 17 -25 -6z',
      color.cape,'stroke="'+color.outline+'" stroke-width="3"')+
    path('M'+round(coreX-9)+' 65l17 4 -6 17 -17 -12z','#7ddcc5','opacity=".55"')+
    circle(coreX+15,72,5,'#dfd2a4')+
    circle(coreX+15,72,2.8,'#9affdb');

  // V2: consistent layered costume details. All are authored vector paths
  // attached to Aren's torso, so every movement frame keeps the same identity.
  const costumeDetails = [
    // A sweeping asymmetric shoulder pauldron, rather than an undetailed shirt.
    path('M'+round(coreX+8)+' 71 q19 -13 31 6 l-8 20 -19 -9z',
      '#cfdbd1','stroke="'+color.outline+'" stroke-width="3"'),
    path('M'+round(coreX+12)+' 75 q13 -7 20 3 l-9 5z',
      '#fcf5d9','opacity=".85"'),
    path('M'+round(coreX+16)+' 83 l9 6 -11 5z',
      '#5dc8b1'),
    // Deep navy front vest with fine moonlit seams.
    path('M'+round(coreX-15)+' 85 l18 9 17 -11 -3 28 -30 2z',
      '#294457','stroke="#193447" stroke-width="2"'),
    path('M'+round(coreX-8)+' 88 l11 8 -8 8z','#a6e0c8'),
    line(coreX+1,98,coreX+5,111,'#b3d1c1',2.2),
    // Three small original constellation clasps keep the costume recognisable.
    circle(coreX+5,97,2.6,'#f8e6b7'),
    circle(coreX+7,103,2.3,'#74edcb'),
    circle(coreX+9,109,2.0,'#f8e6b7'),
    // Braided hip sash + the crescent crest at the belt.
    path('M'+round(coreX-20)+' 113 Q'+round(coreX)+' 119 '+round(coreX+22)+
      ' 113 l3 8 q-22 10 -49 -1z',
      '#436d72','stroke="'+color.outline+'" stroke-width="2"'),
    line(coreX-15,119,coreX+16,119,'#d7c99c',2.8),
    circle(coreX+5,119,7.1,'#e8dec8','stroke="#1e4656" stroke-width="2"'),
    path('M'+round(coreX+4)+' 114 q-7 4 -2 10 q6 4 10 -2 q-7 2 -8 -8z',
      '#54baaa'),
    // Split coat tails animate with the direction of the lower body.
    path('M'+round(coreX-23)+' 120 q-8 19 -5 29 q14 4 26 -7 l4 -17z',
      '#d7ded2','stroke="#233a4e" stroke-width="3"'),
    path('M'+round(coreX+16)+' 120 q8 13 10 27 q-10 6 -25 -6 l2 -18z',
      '#c9d7cf','stroke="#233a4e" stroke-width="3"'),
    path('M'+round(coreX-26)+' 145 q12 0 22 -7',
      'none','stroke="#61c5ac" stroke-width="3"'),
    path('M'+round(coreX+8)+' 138 l15 6',
      'none','stroke="#61c5ac" stroke-width="3"'),
    // Belt pouch, tiny and in front of the far hip.
    path('M'+round(coreX-24)+' 117 q-11 6 -9 17 l14 4 8 -13z',
      '#3d4a59','stroke="#142d40" stroke-width="3"'),
    line(coreX-26,127,coreX-18,129,'#d0c09a',2.5),
  ].join('');
  const neck=circle(coreX+2,70,10,color.skin);
  const face='<ellipse cx="'+round(coreX+4)+'" cy="'+round(headY)+'" rx="21" ry="26" fill="'+color.skin+
    '" stroke="'+color.outline+'" stroke-width="3.3"/>'+
    path('M'+round(coreX+14)+' '+round(headY+2)+' q12 5 1 13',color.skinShadow)+
    // expressive eyes, a blinking frame every full idle cycle
    (state==='idle'&&index===4?line(coreX+7,headY,coreX+16,headY+1,color.outline,2.6):
    '<ellipse cx="'+round(coreX+13)+'" cy="'+round(headY)+'" rx="4.8" ry="7" fill="'+color.outline+
    '"/>'+circle(coreX+14.5,headY-1.6,2.1,color.glow))+
    line(coreX+8,headY-9,coreX+18,headY-10,color.hair,2.5)+
    path('M'+round(coreX-17)+' '+round(headY+12)+' q13 7 26 2','none',
      'stroke="#c58b7f" stroke-width="1.8"');
  const hair=path('M'+round(coreX-20)+' '+round(headY-9)+
    'q-8 -26 2 -29 l12 -8 10 5 17 -8 -4 14 17 -7 -8 16 14 6 -14 9 -4 -9 -15 12 -9 -8 -10 12z',
    color.hair,'stroke="'+color.outline+'" stroke-width="3" stroke-linejoin="round"')+
    path('M'+round(coreX-13)+' '+round(headY-30)+
    'q15 -18 30 -10 l-6 8 -10 -3 -7 16z',color.hairLight,'opacity=".75"')+
    path('M'+round(coreX-18)+' '+round(headY-5)+' q-8 -16 -2 -28 l8 12z',color.hair);
  // The thin moon circlet, side ear crystal and expressive facial linework
  // stay attached to the head instead of the old plain oval silhouette.
  const faceAccessories =
    path('M'+round(coreX-16)+' '+round(headY-19)+' Q'+round(coreX+4)+' '+round(headY-26)+
      ' '+round(coreX+22)+' '+round(headY-18),'none',
      'stroke="#e8e8d5" stroke-width="3.3"')+
    circle(coreX+5,headY-24,4.1,'#7fead5','stroke="#f8efda" stroke-width="1.6"')+
    path('M'+round(coreX-17)+' '+round(headY+4)+' l-7 7 7 7 5 -8z',
      '#8fe3d2','stroke="#244358" stroke-width="2"')+
    line(coreX+17,headY+11,coreX+23,headY+9,'#b78474',1.5);
  const scarf=path('M'+round(coreX-19)+' 71 q20 8 35 0 l-2 13 q-24 12 -40 -4z',
    color.cape,'stroke="'+color.outline+'" stroke-width="3"')+
    path('M'+round(coreX-14)+' 80q-28 8 -'+round(25+scarfMotion)+' 27q9 5 15 -2l'+round(21+scarfMotion)+' -11z',
    '#62bfae','opacity=".88"')+
    line(coreX-9,78,coreX+9,80,'#d9f5ce',2);
  let effect='';
  if(attack) {
    const swingProgress=strikePose.impact;
    const theta=strikePose.bladeAngle*Math.PI/180;
    // The original crescent sabre has a short steel hilt, engraved guard and
    // a narrow pale core; 192px frame clipping must not erase its tip.
    const bladeX=Math.max(12,Math.min(179,mainHandX+Math.cos(theta)*strikePose.bladeReach));
    const bladeY=Math.max(13,Math.min(169,mainHandY+Math.sin(theta)*strikePose.bladeReach-15));
    const guardX=mainHandX+Math.cos(theta)*10,guardY=mainHandY+Math.sin(theta)*10;
    effect=line(mainHandX,mainHandY,bladeX,bladeY,'#10283e',13)+
      line(mainHandX,mainHandY,bladeX,bladeY,strikePose.arcColor,8)+
      line(guardX,guardY,bladeX,bladeY,'#f5fff2',2.7)+
      circle(bladeX,bladeY,4.5,'#f5fff3')+
      circle(guardX,guardY,5.5,'#d7c99c','stroke="#1b4553" stroke-width="2"')+
      line(guardX-8,guardY-3,guardX+7,guardY+3,'#85e0c8',3);
    if(swingProgress>.14){
      const arcRadius=31+strikePose.bladeReach*.3;
      const alpha=round(Math.min(.79,swingProgress*.7));
      // The wind-sweep is linked to the actual blade tip and is intentionally
      // different on upward cuts, diving attacks and the four-hit finisher.
      effect+='<path data-swing="'+state+'" d="M'+round(bladeX-arcRadius*.35)+' '+round(bladeY-arcRadius*.72)+
        ' Q'+round(bladeX+arcRadius*.68)+' '+round(bladeY-arcRadius*.35)+
        ' '+round(bladeX+arcRadius*.2)+' '+round(bladeY+arcRadius*.63)+
        '" fill="none" stroke="'+strikePose.arcColor+
        '" stroke-width="'+round(3+9*swingProgress)+
        '" opacity="'+alpha+'" stroke-linecap="round"/>';
      if(state==='attack_4'){
        // A two-stroke lunar finisher: visually heavier than the basic combos,
        // with its own crescents and a secondary star burst.
        effect+='<path data-finisher="moon" d="M'+round(bladeX-45)+' '+round(bladeY-48)+
          ' Q'+round(bladeX+42)+' '+round(bladeY-64)+
          ' '+round(bladeX+31)+' '+round(bladeY+32)+
          '" fill="none" stroke="#e1fff2" stroke-width="'+round(3+6*swingProgress)+
          '" opacity="'+alpha+'" stroke-linecap="round"/>'+
          circle(bladeX-10,bladeY-9,4+8*swingProgress,'#b0fff0','opacity=".45"');
      }
    }
  }
  if(state==='charge'||skill){
    const level=skill?Number(state.slice(-1)):1, spread=skill?30+phase*62:17+phase*5;
    effect+=circle(mainHandX+12,mainHandY-12,12+level*6,'#62f2d7','opacity=".17"')+
      circle(mainHandX+12,mainHandY-12,7+level*3,'#bcfff0','opacity=".78"')+
      path('M'+round(mainHandX+12)+' '+round(mainHandY-35)+
      'q'+round(spread)+' 12 '+round(spread*.8)+' '+round(spread*.65)+
      'q-'+round(spread*.5)+' '+round(spread*.65)+' -'+round(spread*1.4)+' '+
      round(spread*.3),'none','stroke="#a2ffe0" stroke-width="'+(skill?5:2)+'" opacity=".65"')+
      circle(mainHandX+spread,mainHandY-12,2+level,'#f9fff1');
    if (skill) {
      // MP tiers have progressively more star-like shards. Their centers and
      // movement are mathematical, never random; reduced-motion remains a
      // responsibility of the Phaser overlay (these are authored still frames).
      const cx=mainHandX+13,cy=mainHandY-15;
      const shardCount=level*4+3;
      for(let shard=0;shard<shardCount;shard++){
        const angle=Math.PI*2*(shard/shardCount)+phase*Math.PI*.35;
        const radius=23+level*9+8*Math.sin(phase*Math.PI);
        const sx=cx+Math.cos(angle)*radius,sy=cy+Math.sin(angle)*radius*.72;
        const crystal=path('M'+round(sx)+' '+round(sy-7)+
          ' l4 7 -4 7 -4 -7z',
          level===3?'#efd2ff':level===2?'#b6e8ff':'#c5ffe4',
          'stroke="#fcfff8" stroke-width="1" opacity=".82"');
        effect+=crystal;
      }
      if(level===3){
        // MP3 Dream Crescent — a large signature halo and a segmented
        // constellation outside Aren's core silhouette, within the sheet.
        const pulse=Math.sin(Math.PI*phase);
        const moonX=Math.max(29,Math.min(153,cx+22)),moonY=94-7*pulse;
        effect+='<path data-mp3="dream-crescent" d="M'+round(moonX-38)+' '+round(moonY-37)+
          ' Q'+round(moonX+53)+' '+round(moonY-76)+
          ' '+round(moonX+45)+' '+round(moonY+36)+
          ' Q'+round(moonX+3)+' '+round(moonY+53)+
          ' '+round(moonX-38)+' '+round(moonY-37)+
          '" fill="none" stroke="#e8c7ff" stroke-width="'+round(3+5*pulse)+
          '" opacity="'+round(.3+.56*pulse)+'"/>';
        for(let orbit=0;orbit<5;orbit++){
          const a=phase*Math.PI*.4+orbit*Math.PI*2/5;
          const x=Math.max(8,Math.min(183,moonX+Math.cos(a)*55));
          const y=Math.max(8,Math.min(183,moonY+Math.sin(a)*51));
          effect+=path('M'+round(x)+' '+round(y-6)+
            'l3 6 -3 6 -3 -6z','#f5e8ff','opacity=".82"');
        }
      }
      const haloRadius=26+level*14+phase*29;
      effect+='<ellipse cx="'+round(cx)+'" cy="'+round(cy)+
        '" rx="'+round(haloRadius)+'" ry="'+round(haloRadius*.78)+
        '" fill="none" stroke="'+(level===3?'#da9eff':level===2?'#8cd9ff':'#8ff4cc')+
        '" stroke-width="'+(1+level)+
        '" opacity="'+round(.68*(1-phase*.7))+'"/>';
    }
  }
  if(fast)effect+='<path d="M12 151 h'+round(32+Math.abs(stride))+
    '" stroke="#9cfde2" stroke-width="2.8" opacity=".57"/>';
  if(state==='hurt')effect+=line(coreX-32,40,coreX-43,29,'#ffdcab',3);
  if(state==='land')effect+=line(coreX-39,177,coreX+35,177,'#b8ffee',3);
  // Everything remains inside a transparent 192x192 canvas; the artwork
  // is oriented East. West uses Phaser's actual texture flip, not fake frames.
  return '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">'+
    '<g stroke-linejoin="round" transform="translate(0 '+round(bodyY)+')">'+
    cape+backLeg+backArm+frontLeg+torso+costumeDetails+neck+face+hair+faceAccessories+scarf+frontArm+effect+
    '</g></svg>\n';
}

export function generateArenArt(root=join(dirname(fileURLToPath(import.meta.url)), '..')) {
  const out=join(root,'apps','web','public','art','aren');
  mkdirSync(out,{recursive:true});
  let count=0;
  for(const [state,frames] of Object.entries(AREN_FRAMES)){
    for(let i=0;i<frames;i++){
      writeFileSync(join(out,state+'-'+i+'.svg'),drawArenFrame(state,i,frames));
      count++;
    }
  }
  console.log('Generated '+count+' original Aren animation frames in '+out);
  return count;
}

if(process.argv[1] && process.argv[1].endsWith('generate_aren_art.mjs')) generateArenArt();
