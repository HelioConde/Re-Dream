import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './GameCanvas';
import { PracticeArena, type TrainingStats } from './practiceSimulation';
import { EMPTY_CONTROLS, type CharacterId, type Control, type Snapshot } from './protocol';
import { characterName } from './characters';

type Props = { characterId: CharacterId; nickname: string; onExit: () => void };
export default function PracticeMode({ characterId, nickname, onExit }: Props) {
  const arenaRef = useRef<PracticeArena | null>(null);
  if (arenaRef.current === null) arenaRef.current = new PracticeArena(characterId, nickname || characterName(characterId));
  const arena = arenaRef.current;
  const snapshotRef = useRef<Snapshot | null>(arena.snapshot());
  const mobileRef = useRef<Control>({ ...EMPTY_CONTROLS });
  const [stats, setStats] = useState<TrainingStats>({ ...arena.stats });
  const sendInput = useCallback((input: Control) => { arena.setInput(input); }, [arena]);

  useEffect(() => {
    // Standalone fixed-step local simulation. No socket, login or database.
    // The scene uses the same GameCanvas and controls as the multiplayer mode.
    let lastTime = 0;
    let accumulator = 0;
    let lastUi = 0;
    let frameId = 0;
    const frame = (time: number) => {
      if (!lastTime) lastTime = time;
      accumulator += Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      for (let steps = 0; accumulator >= 1 / 30 && steps < 4; steps++) {
        arena.step(1 / 30);
        accumulator -= 1 / 30;
      }
      snapshotRef.current = arena.snapshot();
      if (time - lastUi > 125) {
        setStats({ ...arena.stats });
        lastUi = time;
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(frameId); };
  }, [arena]);

  const touch = (key: keyof Control, active: boolean) => {
    mobileRef.current = { ...mobileRef.current, [key]: active };
  };
  const reset = () => {
    arena.reset();
    setStats({ ...arena.stats });
    snapshotRef.current = arena.snapshot();
  };

  return <main className="session practice-page" id="praticar">
    <div className="session-top">
      <div><span className="eyebrow">✦ ÁREA DE TREINAMENTO · OFFLINE</span><h1>Campo de Prática</h1>
        <p>{characterName(characterId)} · Teste movimentação, saltos, ataques e habilidades sem entrar numa sala.</p></div>
      <div className="session-actions">
        <button type="button" className="button button-outline" onClick={reset}>↻ Reiniciar treino</button>
        <button type="button" className="button button-ghost" onClick={onExit}>← Seleção</button>
      </div>
    </div>
    <section className="game-shell" aria-label="Modo praticar offline do Re:Dream">
      <div className="rd-game-hud" aria-label="Status de treinamento">
        <div className="rd-hud-player"><span className="rd-hud-face" aria-hidden="true">✊</span>
          <div className="rd-hud-info"><strong>{nickname || 'Luci'} · Fighter</strong>
            <div className="rd-hud-health"><span style={{ width: '100%' }}/></div><small>HP 100 / 100 · treinamento</small></div>
        </div>
        <div className="rd-hud-objective"><strong>✦ Alvo de treino</strong>
          <span>HP {stats.targetHp}/260 · derrotados {stats.defeated}</span></div>
      </div>
      <GameCanvas snapshotRef={snapshotRef} playerId={arena.playerId} sendInput={sendInput} mobileRef={mobileRef}/>
    </section>
    <div className="game-bottom practice-stats">
      <div className="stats"><span>✊ GOLPES <strong>{stats.strikes}</strong></span><span>⚔ ÚLTIMO DANO <strong>{stats.lastDamage}</strong></span><span>✧ ALVOS <strong>{stats.defeated}</strong></span></div>
      <div className="controls-legend"><span>A / D mover</span><span>W / Espaço pular</span><span>J atacar</span><span>K especial</span></div>
    </div>
    <div className="touch-controls" aria-label="Controles de treino para dispositivos móveis">
      <div className="touch-group">
        {([['left','◀'],['right','▶'],['jump','↑']] as const).map(([key,label]) =>
          <button key={key} type="button" className="touch-key" aria-label={key}
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch(key,true);}}
            onPointerUp={()=>touch(key,false)} onPointerCancel={()=>touch(key,false)}
            onLostPointerCapture={()=>touch(key,false)}>{label}</button>)}
      </div>
      <div className="touch-group">
        {([['attack','✊'],['skill','✧']] as const).map(([key,label]) =>
          <button key={key} type="button" className="touch-key touch-attack" aria-label={key}
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch(key,true);}}
            onPointerUp={()=>touch(key,false)} onPointerCancel={()=>touch(key,false)}
            onLostPointerCapture={()=>touch(key,false)}>{label}</button>)}
      </div>
    </div>
    <aside className="practice-hint"><strong>Treino livre:</strong> aproxime-se do alvo, ataque com J ou use K.
      O boneco não causa dano e reaparece depois de derrotado. Este modo não exige servidor e não salva recompensas.</aside>
  </main>;
}
