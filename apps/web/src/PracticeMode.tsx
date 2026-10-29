import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './GameCanvas';
import { PracticeArena, type TrainingStats } from './practiceSimulation';
import { EMPTY_CONTROLS, type CharacterId, type Control, type PracticeInput, type Snapshot } from './protocol';
import { characterName } from './characters';

type Props = { characterId: CharacterId; nickname: string; onExit: () => void };
const touchLabels: Record<'left'|'right'|'jump'|'down'|'attack'|'skill', string> = {
  left: 'Mover para a esquerda', right: 'Mover para a direita',
  jump: 'Pular', down: 'Descer da plataforma',
  attack: 'Atacar', skill: 'Usar habilidade',
};
export default function PracticeMode({ characterId, nickname, onExit }: Props) {
  const arenaRef = useRef<PracticeArena | null>(null);
  if (arenaRef.current === null) arenaRef.current = new PracticeArena(characterId, nickname || characterName(characterId));
  const arena = arenaRef.current;
  const snapshotRef = useRef<Snapshot | null>(arena.snapshot());
  const mobileRef = useRef<PracticeInput>({ ...EMPTY_CONTROLS });
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState<TrainingStats>({ ...arena.stats });
  const sendInput = useCallback((input: Control) => {
    if (!pausedRef.current) arena.setInput(input);
  }, [arena]);
  const pauseTraining = useCallback(() => {
    pausedRef.current = true;
    arena.suspend();
    mobileRef.current = { ...EMPTY_CONTROLS };
    setPaused(true);
  }, [arena]);
  const resumeTraining = () => {
    pausedRef.current = false;
    setPaused(false);
  };
  const togglePause = () => {
    if (pausedRef.current) resumeTraining();
    else pauseTraining();
  };

  useEffect(() => {
    // Standalone fixed-step local simulation. No socket, login or database.
    // The scene uses the same GameCanvas and controls as the multiplayer mode.
    let lastTime = 0;
    let accumulator = 0;
    let lastUi = 0;
    let frameId = 0;
    const frame = (time: number) => {
      if (!lastTime) lastTime = time;
      if (pausedRef.current || document.hidden) {
        lastTime = time;
        accumulator = 0;
        frameId = requestAnimationFrame(frame);
        return;
      }
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
    const onVisibilityChange = () => { if (document.hidden) pauseTraining(); };
    // On tab switches or lost focus, avoid held attacks and movement continuing.
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', pauseTraining);
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', pauseTraining);
    };
  }, [arena, pauseTraining]);

  const touch = (key: keyof Control, active: boolean) => {
    if (pausedRef.current) return;
    mobileRef.current = { ...mobileRef.current, [key]: active };
  };
  const reset = () => {
    mobileRef.current = { ...EMPTY_CONTROLS };
    arena.reset();
    setStats({ ...arena.stats });
    snapshotRef.current = arena.snapshot();
  };

  return <main className="session practice-page" id="praticar">
    <div className="session-top">
      <div><span className="eyebrow">✦ ÁREA DE TREINAMENTO · OFFLINE</span><h1>Campo de Prática</h1>
        <p>{characterName(characterId)} · Teste movimentação, saltos, ataques e habilidades sem entrar numa sala.</p></div>
      <div className="session-actions">
        <button type="button" className="button button-outline" onClick={togglePause} aria-pressed={paused}>
          {paused ? '▶ Continuar' : 'Ⅱ Pausar'}
        </button>
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
      <GameCanvas snapshotRef={snapshotRef} playerId={arena.playerId} sendInput={sendInput} mobileRef={mobileRef} practiceMode/>
      {paused && <div className="practice-pause-overlay" role="status" aria-live="polite">
        <span className="eyebrow">✦ TREINAMENTO OFFLINE</span>
        <strong>Treino pausado</strong>
        <p>Seus resultados continuam aqui. Retome quando estiver pronto.</p>
        <button type="button" className="button button-primary" onClick={resumeTraining}>▶ Continuar treino</button>
      </div>}
    </section>
    <div className="game-bottom practice-stats">
      <div className="stats"><span>✊ GOLPES <strong>{stats.strikes}</strong></span><span>⚔ ÚLTIMO DANO <strong>{stats.lastDamage}</strong></span><span>✧ ALVOS <strong>{stats.defeated}</strong></span><span>⚡ DASHES <strong>{stats.dashes}</strong></span><span>↗ AÉREOS <strong>{stats.aerialHits}</strong></span></div>
      <div className="practice-combat-meters" aria-label="Indicadores de combate">
        <div className="practice-meter">
          <div className="practice-meter-label"><span>✦ MP</span><strong>{stats.mp}/100</strong></div>
          <div className="practice-meter-track"><span style={{width: stats.mp+'%'}}/></div>
        </div>
        <div className="practice-meter">
          <div className="practice-meter-label"><span>⚡ Carga Z</span><strong>{stats.chargePercent}%</strong></div>
          <div className="practice-meter-track charge"><span style={{width: stats.chargePercent+'%'}}/></div>
        </div>
        <strong className="practice-combo-label" aria-live="off">{stats.combo > 1 ? stats.combo+' HIT COMBO' : 'COMBO · '+stats.bestCombo+' recorde'}</strong>
      </div>
      <div className="controls-legend"><span>← → / A D mover · toque duplo: dash</span><span>↑ / W pular</span><span>↓ / S descer plataforma</span><span>J: combo · Z: segure para carregar</span><span>K / X: habilidade</span></div>
    </div>
    <div className="touch-controls" aria-label="Controles de treino para dispositivos móveis">
      <div className="touch-group">
        {([['left','◀'],['right','▶'],['jump','↑'],['down','↓']] as const).map(([key,label]) =>
          <button key={key} type="button" className="touch-key" aria-label={touchLabels[key]} disabled={paused}
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch(key,true);}}
            onPointerUp={()=>touch(key,false)} onPointerCancel={()=>touch(key,false)}
            onLostPointerCapture={()=>touch(key,false)}>{label}</button>)}
      </div>
      <div className="touch-group">
        {([['attack','✊'],['skill','✧']] as const).map(([key,label]) =>
          <button key={key} type="button" className="touch-key touch-attack" aria-label={touchLabels[key]} disabled={paused}
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch(key,true);}}
            onPointerUp={()=>touch(key,false)} onPointerCancel={()=>touch(key,false)}
            onLostPointerCapture={()=>touch(key,false)}>{label}</button>)}
      </div>
    </div>
    <aside className="practice-hint"><strong>Treino estilo arcade:</strong> aperte duas vezes a mesma direção para dar dash, combine golpes com J e ataque no ar.
      Toque ↓ sobre uma plataforma para atravessá-la. Um toque curto em Z ataca; segure Z e solte para usar uma habilidade quando houver MP.
      K ou X também ativa a habilidade. O boneco reaparece após ser derrotado. Sem servidor ou recompensas online.</aside>
  </main>;
}
