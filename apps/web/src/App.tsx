import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import GameCanvas from './GameCanvas';
import PracticeMode from './PracticeMode';
import { resolveStandaloneRoute } from './routeState';
import AdventureHub from './AdventureHub';
import CharacterSelect from './CharacterSelect';
import { characterName, getCharacter } from './characters';
import type { CharacterId, Control, ServerMessage, Snapshot } from './protocol';
import { clearLocalProfile, EMPTY_PROFILE, readLocalProfile, saveLocalProfile } from './localProfile';

const configuredUrl = import.meta.env.VITE_WS_URL?.trim() || '';
const websocketUrl = configuredUrl || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'ws://localhost:3001/ws' : '');

type Connection = 'idle' | 'connecting' | 'online' | 'offline';

export default function App() {
  const [localProfile, setLocalProfile] = useState(readLocalProfile);
  const [name, setName] = useState(() => readLocalProfile().nickname);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>(() => readLocalProfile().characterId);
  // Direct links like /Re-Dream/#personagens open the selection immediately.
  const [selectionIntent, setSelectionIntent] = useState<'create' | 'join' | null>(
    () => typeof window !== 'undefined' && window.location.hash === '#personagens' ? 'create' : null,
  );
  const [roomInput, setRoomInput] = useState('');
  const [practiceActive, setPracticeActive] = useState(
    () => typeof window !== 'undefined' && resolveStandaloneRoute(window.location.hash) === 'practice',
  );
  const [connection, setConnection] = useState<Connection>('idle');
  const [error, setError] = useState('');
  const [room, setRoom] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const mobileRef = useRef<Control>({ left: false, right: false, jump: false, attack: false, skill: false });
  const recordedResult = useRef('');

  // The server determines match results; the browser only keeps a local,
  // non-authoritative summary for this prototype.
  useEffect(() => {
    if (!snapshot || (snapshot.status !== 'victory' && snapshot.status !== 'defeat') || !room || !playerId) return;
    const resultId = room + ':' + playerId;
    if (recordedResult.current === resultId) return;
    recordedResult.current = resultId;
    const previous = readLocalProfile();
    const updated = {
      ...previous,
      victories: previous.victories + Number(snapshot.status === 'victory'),
      defeats: previous.defeats + Number(snapshot.status === 'defeat'),
      lastPlayed: new Date().toISOString(),
    };
    saveLocalProfile(updated);
    setLocalProfile(updated);
  }, [snapshot?.status, room, playerId]);

  const resetLocalHistory = () => {
    clearLocalProfile();
    setLocalProfile({ ...EMPTY_PROFILE });
    setName('');
    setSelectedCharacter('aren');
    setRoomInput('');
  };

  const disconnect = useCallback(() => {
    const ws = socketRef.current;
    socketRef.current = null;
    ws?.close(1000, 'Sair da masmorra');
    snapshotRef.current = null;
    setSnapshot(null);
    setPlayerId('');
    setRoom('');
    setConnection('idle');
    setSelectionIntent(null);
    if (window.location.hash === '#personagens') window.location.hash = 'jogar';
  }, []);

  useEffect(() => () => { socketRef.current?.close(); }, []);

  // Keep the browser back button and deep links in sync with the selection.
  useEffect(() => {
    const onHashChange = () => {
      if (room) return;
      const route = resolveStandaloneRoute(window.location.hash);
      setPracticeActive(route === 'practice');
      if (route === 'characters') {
        setSelectionIntent(previous => previous ?? 'create');
      } else {
        setSelectionIntent(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [room]);

  const openCharacterSelect = (intent: 'create' | 'join') => {
    if (room || connection === 'connecting') return;
    setError('');
    setSelectionIntent(intent);
    if (window.location.hash !== '#personagens') {
      window.location.hash = 'personagens';
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const connect = (requestedRoom: string) => {
    setError('');
    if (!websocketUrl) {
      setError('O frontend já está publicado, mas ainda falta configurar a URL pública do servidor WebSocket (VITE_WS_URL).');
      return;
    }
    const safeName = name.trim().slice(0, 20);
    if (safeName.length < 2) { setError('Escolha um apelido de pelo menos 2 caracteres.'); return; }
    const normalizedRoom = requestedRoom.trim().toUpperCase();
    if (normalizedRoom && !/^[A-Z0-9]{4,8}$/.test(normalizedRoom)) {
      setError('O código da sala deve ter de 4 a 8 letras ou números.');
      return;
    }
    const saved = { ...readLocalProfile(), nickname: safeName, characterId: selectedCharacter };
    saveLocalProfile(saved);
    setLocalProfile(saved);
    socketRef.current?.close();
    setConnection('connecting');
    try {
      const socket = new WebSocket(websocketUrl);
      socketRef.current = socket;
      let legacyIdAttempted = false;
      // Render may still be running the previous server. A one-time wire-only
      // compatibility alias lets that server accept a join; all clients using
      // this build still render Aren and only Aren.
      socket.onopen = () => socket.send(JSON.stringify({ type: 'join', name: safeName, room: normalizedRoom || undefined, characterId: selectedCharacter }));
      socket.onmessage = event => {
        let message: ServerMessage;
        try { message = JSON.parse(event.data) as ServerMessage; } catch { return; }
        if (socketRef.current !== socket) return;
        if (message.type === 'joined') {
          setRoom(message.room);
          setRoomInput(message.room);
          const updated = {
            ...readLocalProfile(),
            nickname: safeName,
            characterId: selectedCharacter,
            lastRoom: message.room,
            lastPlayed: new Date().toISOString(),
          };
          saveLocalProfile(updated);
          setLocalProfile(updated);
          setPlayerId(message.id);
          setConnection('online');
        } else if (message.type === 'snapshot') {
          snapshotRef.current = message;
          setSnapshot(message);
        } else if (message.type === 'error') {
          if (message.message === 'Personagem inválido.' && !legacyIdAttempted && selectedCharacter === 'aren') {
            legacyIdAttempted = true;
            socket.send(JSON.stringify({ type: 'join', name: safeName,
              room: normalizedRoom || undefined, characterId: 'luci' }));
            return;
          }
          setError(message.message);
          socket.close();
        }
      };
      socket.onerror = () => setError('Não foi possível conectar ao servidor de partidas.');
      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        setConnection('offline');
        setRoom('');
        setPlayerId('');
        snapshotRef.current = null;
        setSnapshot(null);
      };
    } catch {
      setConnection('offline');
      setError('A URL do WebSocket é inválida. Verifique VITE_WS_URL.');
    }
  };

  const sendInput = useCallback((control: Control) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'input', ...control }));
    }
  }, []);

  const touch = (key: keyof Control, pressed: boolean) => {
    mobileRef.current = { ...mobileRef.current, [key]: pressed };
  };

  const join = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    openCharacterSelect('join');
  };
  const chooseCharacter = (characterId: CharacterId) => {
    setSelectedCharacter(characterId);
    const updated = { ...readLocalProfile(), characterId };
    saveLocalProfile(updated);
    setLocalProfile(updated);
  };
  const startPractice = () => {
    if (connection === 'connecting' || room) return;
    setPracticeActive(true);
    setSelectionIntent(null);
    setError('');
    window.location.hash = 'praticar';
  };
  const exitPractice = () => {
    setPracticeActive(false);
    setSelectionIntent('create');
    window.location.hash = 'personagens';
  };

  const isLobby = connection === 'online' && Boolean(room) && (!snapshot || snapshot.status === 'lobby');
  const isPlaying = connection === 'online' && Boolean(room) && !!snapshot && snapshot.status !== 'lobby';
  const isHost = snapshot?.hostId === playerId;
  const beginDungeon = () => {
    if (isHost && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'start' }));
    }
  };
  const me = snapshot?.players.find(player => player.id === playerId);

  return (
    <div className="app app-reboot">
      {(isLobby || isPlaying || Boolean(selectionIntent) || practiceActive) && <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Re:Dream — início"><span className="brand-mark">✧</span><span>Re<span className="brand-accent">:</span>Dream</span></a>
        <nav aria-label="Navegação principal">
          <a href="#inicio">Início</a><a href="#universo">Universo</a>
          <button type="button" onClick={() => openCharacterSelect('create')} disabled={Boolean(room)} aria-label="Abrir seleção de personagens">Personagens</button>
        </nav>
        <a className="github-link" href="https://github.com/HelioConde/Re-Dream" target="_blank" rel="noreferrer">GitHub ↗</a>
      </header>}

      {practiceActive ? (
        <PracticeMode characterId={selectedCharacter} nickname={name.trim() || 'Aren'} onExit={exitPractice}/>
      ) : isLobby ? (
        <main className="lobby-page" id="jogar">
          <div className="lobby-ambient" aria-hidden="true">✧</div>
          <div className="lobby-eyebrow">✦ PORTAL DE AVENTUREIROS</div>
          <h1>Salão dos Sonhos</h1>
          <p className="lobby-subtitle">Reúna sua equipe antes de atravessar o portal da masmorra.</p>
          <section className="lobby-panel">
            <div className="lobby-topbar">
              <div><span className="eyebrow">SALA COOPERATIVA</span><h2>{room}</h2></div>
              <button className="button button-outline" onClick={() => {
                void navigator.clipboard?.writeText(room);
              }}>Copiar convite ⧉</button>
            </div>
            <div className="lobby-slots" role="list" aria-label="Membros da equipe">
              {Array.from({ length: 4 }, (_, i) => {
                const adventurer = snapshot?.players[i];
                return <div className={'lobby-slot ' + (adventurer ? 'occupied' : '')} key={i} role="listitem">
                  <div className={'lobby-avatar ' + (adventurer ? 'sprite-' + (adventurer.characterId || 'aren') : '')}
                    style={adventurer ? {
                      backgroundImage: `url(${import.meta.env.BASE_URL}${getCharacter(adventurer.characterId).preview})`,
                      backgroundSize: getCharacter(adventurer.characterId).artSize,
                      backgroundPosition: getCharacter(adventurer.characterId).previewPosition || '0 0',
                    } : undefined}>{adventurer ? '' : '+'}</div>
                  <div className="lobby-slot-info"><strong>{adventurer?.name ?? 'Aguardando aventureiro'}</strong><span>{adventurer ? (adventurer.id === snapshot?.hostId ? 'Líder · ' : '') + characterName(adventurer.characterId) : 'Vaga disponível'}</span></div>
                  {adventurer && <span className="lobby-ready">Pronto</span>}
                </div>;
              })}
            </div>
            <div className="lobby-pick">
              <span className="eyebrow">PROTAGONISTA DO REBOOT</span>
              <div className="lobby-pick-options" role="status">
                <span className="lobby-pick-choice active">✦ Aren · Buscador de Sonhos</span>
              </div>
            </div>
            <div className="lobby-quest">
              <span className="lobby-quest-icon">♜</span>
              <div><h3>Bosque dos Sonhos</h3><p>3 ondas de monstros · 1 chefão · Até 4 jogadores</p></div>
              <span className="lobby-difficulty">Iniciante</span>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="lobby-buttons">
              <button className="button button-ghost" onClick={disconnect}>← Sair do lobby</button>
              {isHost
                ? <button className="button button-primary" onClick={beginDungeon} disabled={!snapshot}>✦ Iniciar aventura →</button>
                : <span className="lobby-wait">Aguardando o líder iniciar a partida…</span>}
            </div>
          </section>
          <p className="lobby-footnote">Cada jogador controla seu personagem. A masmorra só começa quando o líder escolher iniciar.</p>
        </main>
      ) : isPlaying ? (
        <main className="session" id="jogar">
          <div className="session-top">
            <div><span className="eyebrow">✦ MASMORRA COOPERATIVA</span><h1>Bosque dos Sonhos</h1><p>Etapa {snapshot?.wave || 1} / 3 · {snapshot?.players.length || 1}/4 aventureiros</p></div>
            <div className="session-actions">
              <button className="room-chip" onClick={() => navigator.clipboard?.writeText(room)} title="Copiar código da sala">SALA {room} ⧉</button>
              <button className="button button-ghost" onClick={disconnect}>Sair da sala</button>
            </div>
          </div>
          <section className="game-shell" aria-label="Jogo Re:Dream">
            <div className="rd-game-hud" aria-label="Informações da missão">
              <div className="rd-hud-player"><span className="rd-hud-face" aria-hidden="true">✧</span><div className="rd-hud-info"><strong>{me?.name || 'Aventureiro'}</strong><div className="rd-hud-health"><span style={{ width: Math.max(0, Math.min(100, me?.hp ?? 0)) + '%' }}/></div><small>HP {me?.hp ?? 0} / 100</small></div></div>
              <div className="rd-hud-objective"><strong>✦ Bosque dos Sonhos</strong><span>Onda {snapshot?.wave ?? 1}/3 · {snapshot?.remaining ?? 0} inimigos</span></div>
            </div>
            <GameCanvas snapshotRef={snapshotRef} playerId={playerId} sendInput={sendInput} mobileRef={mobileRef} />
            {snapshot?.status === 'victory' && <div className="game-outcome"><h2>Missão concluída! ✦</h2><p>O Bosque dos Sonhos voltou a brilhar.</p><button className="button button-primary" onClick={disconnect}>Voltar ao início</button></div>}
            {snapshot?.status === 'defeat' && <div className="game-outcome"><h2>Os sonhos resistem...</h2><p>Reúna seus aliados e tente novamente.</p><button className="button button-primary" onClick={disconnect}>Voltar ao início</button></div>}
          </section>
          <div className="game-bottom">
            <div className="stats"><span>♥ VIDA <strong>{me?.hp ?? 100}/100</strong></span><span>✧ PONTOS <strong>{me?.score ?? 0}</strong></span><span>⚔ INIMIGOS <strong>{snapshot?.remaining ?? 0}</strong></span></div>
            <div className="controls-legend"><span>A / D · Mover</span><span>W / Espaço · Pular</span><span>↓ · Descer plataforma</span><span>J · Atacar</span><span>K · Especial</span></div>
          </div>
          <div className="touch-controls" aria-label="Controles para dispositivos móveis">
            <div className="touch-group">
              {([['left','◀'],['right','▶'],['jump','↑'],['down','↓']] as const).map(([key,label]) => <button key={key} className="touch-key" aria-label={key} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); touch(key,true); }} onPointerUp={() => touch(key,false)} onPointerCancel={() => touch(key,false)} onLostPointerCapture={() => touch(key,false)}>{label}</button>)}
            </div>
            <div className="touch-group">
              {([['attack','⚔'],['skill','✦']] as const).map(([key,label]) => <button key={key} className="touch-key touch-attack" aria-label={key} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); touch(key,true); }} onPointerUp={() => touch(key,false)} onPointerCancel={() => touch(key,false)} onLostPointerCapture={() => touch(key,false)}>{label}</button>)}
            </div>
          </div>
          <section className="party-card"><h2>Aventureiros da sala</h2><div className="party-members">{snapshot?.players.map(player => <div className="party-member" key={player.id}><span className="party-avatar">✧</span><span>{player.name}{player.id === playerId ? ' (você)' : ''} · {characterName(player.characterId)}</span><span>{player.hp > 0 ? '♥ ' + player.hp : 'Caído'}</span></div>)}</div></section>
        </main>
      ) : selectionIntent ? (
        <CharacterSelect
          selected={selectedCharacter}
          nickname={name}
          roomCode={roomInput}
          intent={selectionIntent}
          busy={connection === 'connecting'}
          error={error}
          onSelect={chooseCharacter}
          onNickname={setName}
          onRoomCode={setRoomInput}
          onBack={() => {setSelectionIntent(null);setError('');window.location.hash='jogar';}}
          onConfirm={() => connect(selectionIntent === 'join' ? roomInput : '')}
          onPractice={startPractice}
        />
      ) : (
        <AdventureHub
          profile={localProfile}
          characterId={selectedCharacter}
          onlineConfigured={Boolean(websocketUrl)}
          onPlay={() => openCharacterSelect('create')}
          onJoin={() => openCharacterSelect('join')}
          onClearLocal={resetLocalHistory}
        />
      )}
      {(isLobby || isPlaying || Boolean(selectionIntent) || practiceActive) && <footer><span className="brand"><span className="brand-mark">✧</span> Re<span className="brand-accent">:</span>Dream</span><span>Projeto independente em desenvolvimento · pré-alfa</span><a href="https://github.com/HelioConde/Re-Dream" target="_blank" rel="noreferrer">Código no GitHub ↗</a></footer>}
    </div>
  );
}
