import { useEffect, useState } from 'react';
import { AREN_ACTIONS, AREN_FRAME_COUNTS, type ArenAction } from './arenAnimation';

const LABELS: Record<ArenAction,string> = {
  idle:'Parado / Respiração',walk:'Caminhar',run:'Corrida',dash:'Dash',
  rise:'Salto / Subida',fall:'Queda',rocket:'Rocket Step',shadow:'Shadow Step',
  land:'Pouso',attack_1:'Combo I',attack_2:'Combo II',attack_3:'Combo III',
  attack_4:'Combo IV',dash_attack:'Golpe do dash',air_attack:'Golpe aéreo',
  launcher:'Lançador',dive:'Mergulho',otto:'Otto Shot',charge:'Carregar Z',
  skill_1:'Magia MP1',skill_2:'Magia MP2',skill_3:'Magia MP3',hurt:'Reação a dano',
};

/** A QA/workshop surface; does not simulate or change actual gameplay.
 * All frames are exact generated assets consumed by the Phaser arena.
 */
export default function ArenAnimationInspector() {
  const [action,setAction] = useState<ArenAction>('idle');
  const [frame,setFrame] = useState(0);
  const [playing,setPlaying] = useState(() =>
    typeof window === 'undefined' ? false :
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [mirrored,setMirrored] = useState(false);
  const count=AREN_FRAME_COUNTS[action];
  const changeAction=(next:ArenAction)=>{setAction(next);setFrame(0);};
  useEffect(()=>{
    if (!playing) return;
    // Every action is visible without depending on a game room or keyboard.
    const ms=Math.max(65,Math.min(175,Math.round(850/count)));
    const id=window.setInterval(()=>setFrame(previous=>(previous+1)%count),ms);
    return ()=>window.clearInterval(id);
  },[action,count,playing]);
  const asset=(index:number)=>
    import.meta.env.BASE_URL+'art/aren/'+action+'-'+index+'.svg';

  return <section className="aren-inspector" aria-label="Oficina de animações originais do Aren">
    <div className="aren-inspector-heading">
      <div>
        <span className="eyebrow">✦ RE:DREAM · AREN ART V4</span>
        <h2>Inspecionar as 23 animações do Aren</h2>
        <p>Os quadros exibidos aqui são os mesmos usados no jogo. Escolha uma ação,
          pause e compare poses, silhueta, roupa, efeitos e contato com o chão.
          Compare os quatro combos, Lançador, Otto e Magia MP3: agora têm poses-chave próprias.</p>
      </div>
      <span className="aren-inspector-count">{count} quadros</span>
    </div>
    <div className="aren-inspector-layout">
      <div className="aren-inspector-stage">
        <div className="aren-inspector-moon" aria-hidden="true">☾</div>
        <img src={asset(frame)} alt={LABELS[action]+' — quadro '+(frame+1)+' de '+count}
          draggable={false} style={{transform:mirrored?'scaleX(-1)':'none'}}/>
        <div className="aren-inspector-floor" aria-hidden="true"/>
      </div>
      <div className="aren-inspector-controls">
        <label htmlFor="aren-anim-action">Movimento</label>
        <select id="aren-anim-action" value={action} onChange={event=>changeAction(event.target.value as ArenAction)}>
          {AREN_ACTIONS.map(key=><option value={key} key={key}>{LABELS[key]}</option>)}
        </select>
        <label htmlFor="aren-anim-frame">Quadro {frame+1} / {count}</label>
        <input id="aren-anim-frame" type="range" min={0} max={count-1} step={1}
          value={frame} onChange={event=>setFrame(Number(event.target.value))}/>
        <div className="aren-inspector-actions">
          <button type="button" onClick={()=>setFrame(v=>(v-1+count)%count)}>← Quadro</button>
          <button type="button" aria-pressed={playing}
            onClick={()=>setPlaying(v=>!v)}>{playing?'Ⅱ Pausar':'▶ Animar'}</button>
          <button type="button" onClick={()=>setFrame(v=>(v+1)%count)}>Quadro →</button>
        </div>
        <label className="aren-inspector-flip">
          <input type="checkbox" checked={mirrored} onChange={event=>setMirrored(event.target.checked)}/>
          Espelhar para a esquerda
        </label>
        <p>Esta oficina mostra o resultado visual do gerador atual — arte vetorial original,
          ainda em evolução para alcançar a qualidade do conceito.</p>
      </div>
    </div>
    <div className="aren-inspector-strip" aria-label={'Miniaturas de '+LABELS[action]}>
      {Array.from({length:count},(_,i)=><button type="button" key={i}
        className={'aren-inspector-thumb'+(frame===i?' is-current':'')}
        aria-label={'Ver quadro '+(i+1)} aria-current={frame===i?'true':undefined}
        onClick={()=>{setFrame(i);setPlaying(false);}}>
        <img src={asset(i)} alt="" loading="lazy"/>
        <span>{String(i+1).padStart(2,'0')}</span>
      </button>)}
    </div>
  </section>;
}
