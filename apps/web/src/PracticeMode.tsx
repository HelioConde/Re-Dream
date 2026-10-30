import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './GameCanvas';
import { PracticeArena, type TrainingStats } from './practiceSimulation';
import { EMPTY_CONTROLS, type CharacterId, type Control, type PracticeInput, type Snapshot } from './protocol';
import { characterName } from './characters';
import type { LocomotionState } from './locomotionFsm';

const locomotionLabels: Record<LocomotionState, string> = {
  idle: 'Parado', walk: 'Andando', dash: 'Dash', run: 'Correndo',
  rise: 'Subindo', fall: 'Caindo', rocket: 'Rocket Step', shadow: 'Shadow Step',
};

type Props = { characterId: CharacterId; nickname: string; onExit: () => void };
const touchLabels: Record<'left'|'right'|'jump'|'down'|'drop'|'attack'|'charge', string> = {
  left: 'Mover para a esquerda', right: 'Mover para a direita',
  jump: 'Pular', down: 'Descer da plataforma',
  drop: 'Descer imediatamente de uma plataforma', attack: 'Atacar com J',
  charge: 'Atacar com Z ou segurar e soltar para executar habilidade',
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

  const touch = (key: Exclude<keyof PracticeInput, 'skillLevel'>, active: boolean) => {
    if (pausedRef.current) return;
    mobileRef.current = { ...mobileRef.current, [key]: active };
  };
  const reset = () => {
    mobileRef.current = { ...EMPTY_CONTROLS };
    arena.reset();
    setStats({ ...arena.stats });
    snapshotRef.current = arena.snapshot();
  };
  const testPlatformDrop = () => {
    if (pausedRef.current) return;
    mobileRef.current = { ...EMPTY_CONTROLS };
    arena.placeOnPlatformForTraining();
    snapshotRef.current = arena.snapshot();
    setStats({ ...arena.stats });
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
        <button type="button" className="button button-outline" onClick={testPlatformDrop} disabled={paused}
          title="Posiciona o Luci sobre uma plataforma vazada, para conferir se ↓ funciona">
          ↓ Testar plataforma
        </button>
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
      {stats.onPlatform && !paused && !stats.chaseReady && <div className="practice-platform-prompt" role="status">
        <strong>↓ DESCER PLATAFORMA</strong>
        <small>Você pousou na plataforma · toque ↓ uma vez</small>
      </div>}
      {stats.chaseReady && !paused && <div className="practice-chase-prompt" role="status">
        <strong>↑ PERSEGUIR</strong>
        <small>Solte e pressione ↑ de novo para continuar o combo no ar</small>
      </div>}
      {paused && <div className="practice-pause-overlay" role="status" aria-live="polite">
        <span className="eyebrow">✦ TREINAMENTO OFFLINE</span>
        <strong>Treino pausado</strong>
        <p>Seus resultados continuam aqui. Retome quando estiver pronto.</p>
        <button type="button" className="button button-primary" onClick={resumeTraining}>▶ Continuar treino</button>
      </div>}
    </section>
    <div className="game-bottom practice-stats">
      <div className="stats"><span>✊ GOLPES <strong>{stats.strikes}</strong></span><span>⚔ ÚLTIMO DANO <strong>{stats.lastDamage}</strong></span><span>✧ ALVOS <strong>{stats.defeated}</strong></span><span>⚡ DASHES <strong>{stats.dashes}</strong></span><span>🏃 CORRIDAS <strong>{stats.runs}</strong></span><span>◈ ESTADO <strong>{locomotionLabels[stats.locomotion]}</strong></span><span>↗ AÉREOS <strong>{stats.aerialHits}</strong></span><span>↑ LANÇAMENTOS <strong>{stats.launchers}</strong></span><span>↓ ESTOCADAS <strong>{stats.dives}</strong></span><span>↗ PERSEGUIÇÕES <strong>{stats.chaseJumps}</strong></span><span>✦ JUGGLES <strong>{stats.juggles}</strong></span><span>🚀 ROCKET <strong>{stats.rocketSteps}</strong></span><span>↓ SHADOW <strong>{stats.shadowSteps}</strong></span><span>↓ DESCIDAS <strong>{stats.drops}</strong></span><span>↔ CANCEL <strong>{stats.dashCancels}</strong></span><span>✦ OTTO <strong>{stats.ottoShots}</strong></span></div>
      <div className="practice-combat-meters" aria-label="Indicadores de combate">
        <div className="practice-meter">
          <div className="practice-meter-label"><span>✦ MP · 3 níveis</span><strong>{stats.mp}/300</strong></div>
          <div className="practice-mp-segments" aria-label="Três barras de MP">
            {([0, 1, 2] as const).map(bar => <span key={bar} className="practice-mp-segment">
              <i style={{width: Math.max(0, Math.min(100, stats.mp - bar * 100)) + '%'}}/>
            </span>)}
          </div>
        </div>
        <div className="practice-meter">
          <div className="practice-meter-label"><span>⚡ Carga Z</span><strong>{stats.chargeLevel > 0 ? 'Nível ' + stats.chargeLevel : stats.chargePercent + '%'}</strong></div>
          <div className="practice-meter-track charge"><span style={{width: stats.chargePercent+'%'}}/></div>
        </div>
        <strong className="practice-combo-label" aria-live="off">{stats.juggleChain > 0 ? stats.juggleChain+' AIR JUGGLE · '+stats.combo+' HIT' : stats.combo > 1 ? stats.combo+' HIT COMBO' : 'COMBO · '+stats.bestCombo+' recorde'}</strong>
      </div>
      <div className="controls-legend"><span>← →: um toque anda · dois dão dash · segurar o segundo mantém corrida</span><span>Dash + ↑: Rocket Step · ↓ no ar: Shadow Step</span><span>Dash + direção oposta: cancelar</span><span>↓: descer plataforma vazada · ↓+Espaço: opcional</span><span>Z: combo · segure e solte: MP nível 1/2/3</span><span>Magias: somente segurando Z e soltando no nível desejado</span><span>↑+Z no combo: lançar · ↑ novamente: perseguir</span><span>↓+Z no ar: estocada · ↓+Z na borda: Otto</span><span>J e W: alternativas para ataque e salto</span></div>
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
        {([['attack','J'],['charge','Z']] as const).map(([key,label]) =>
          <button key={key} type="button" className="touch-key touch-attack" aria-label={touchLabels[key]} disabled={paused}
            onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch(key,true);}}
            onPointerUp={()=>touch(key,false)} onPointerCancel={()=>touch(key,false)}
            onLostPointerCapture={()=>touch(key,false)}>{label}</button>)}
      </div>
    </div>
    <aside className="practice-hint"><strong>Movimentos avançados do Luci:</strong> setas ←/→ para andar; pressione duas vezes rapidamente a mesma direção para dash e **mantenha a segunda pressão** para correr continuamente após o dash. Soltar a seta interrompe a corrida. ↑ durante o dash ativa Rocket Step.
      Toque ↓ durante o Rocket para Shadow Step (descida rápida); pressione a direção oposta durante o dash para cancelar o avanço.
      Para conferir o comando imediatamente, use o botão "↓ Testar plataforma": ele coloca o Luci sobre uma plataforma vazada; depois toque ↓. Em cima dela, basta tocar ↓ (no teclado ou celular) para atravessá-la. O chão sólido continua firme. ↓+Z na borda mantém a prioridade do Otto; ↓+Espaço permanece um atalho opcional de descida imediata.
      Z é o ataque principal: toques sucessivos fazem combo e segurar por cerca de 0,65 / 1,30 / 1,95 s carrega os níveis de MP 1, 2 e 3; solte para executar o nível carregado quando houver MP.
      Não existem atalhos para soltar magia: segure Z e solte no nível escolhido. Cada barra custa 100 MP; ataques recuperam MP.
      ↑+Z durante um combo lança o inimigo, ↑ novamente persegue e ↓+Z no ar finaliza com estocada.
      J permanece como alternativa de ataque; W pode pular. O modo Praticar é offline e não modifica o combate multiplayer.</aside>
  </main>;
}
