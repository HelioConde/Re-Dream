import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import GameCanvas from './GameCanvas';
import CharacterSelect from './CharacterSelect';
import { characterName } from './characters';
import type { CharacterId, Control, ServerMessage, Snapshot } from './protocol';
import { clearLocalProfile, EMPTY_PROFILE, readLocalProfile, saveLocalProfile } from './localProfile';

const configuredUrl = import.meta.env.VITE_WS_URL?.trim() || '';
const websocketUrl = configuredUrl || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'ws://localhost:3001/ws' : '');

type Connection = 'idle' | 'connecting' | 'online' | 'offline';

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <article className="feature"><span className="feature-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{description}</p></article>;
}

export default function App() {
  const [localProfile, setLocalProfile] = useState(readLocalProfile);
  const [name, setName] = useState(() => readLocalProfile().nickname);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>(() => readLocalProfile().characterId);
  // Direct links like /Re-Dream/#personagens open the selection immediately.
  const [selectionIntent, setSelectionIntent] = useState<'create' | 'join' | null>(
    () => typeof window !== 'undefined' && window.location.hash === '#personagens' ? 'create' : null,
  );
  const [roomInput, setRoomInput] = useState('');
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
    setSelectedCharacter('rose');
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
      if (window.location.hash === '#personagens') {
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
  const changeLobbyCharacter = (characterId: CharacterId) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN || snapshot?.status !== 'lobby') return;
    chooseCharacter(characterId);
    socketRef.current.send(JSON.stringify({ type: 'select', characterId }));
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
    <div className="app">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Re:Dream — início"><span className="brand-mark">✧</span><span>Re<span className="brand-accent">:</span>Dream</span></a>
        <nav aria-label="Navegação principal">
          <a href="#inicio">Início</a><a href="#universo">Universo</a>
          <button type="button" onClick={() => openCharacterSelect('create')} disabled={Boolean(room)} aria-label="Abrir seleção de personagens">Personagens</button>
        </nav>
        <a className="github-link" href="https://github.com/HelioConde/Re-Dream" target="_blank" rel="noreferrer">GitHub ↗</a>
      </header>

      {isLobby ? (
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
                  <div className={'lobby-avatar ' + (adventurer ? 'sprite-' + (adventurer.characterId || 'rose') : '')}
                    style={adventurer ? {
                      backgroundImage: `url(${import.meta.env.BASE_URL}${adventurer.characterId === 'wanderer' ? 'sprites/imported/char/right.png' : 'sprites/rose-hero-real.webp'})`,
                      backgroundSize: adventurer.characterId === 'wanderer' ? '800% 100%' : '400% 200%',
                    } : undefined}>{adventurer ? '' : '+'}</div>
                  <div className="lobby-slot-info"><strong>{adventurer?.name ?? 'Aguardando aventureiro'}</strong><span>{adventurer ? (adventurer.id === snapshot?.hostId ? 'Líder · ' : '') + characterName(adventurer.characterId) : 'Vaga disponível'}</span></div>
                  {adventurer && <span className="lobby-ready">Pronto</span>}
                </div>;
              })}
            </div>
            <div className="lobby-pick">
              <span className="eyebrow">MEU PERSONAGEM · TROQUE ANTES DA PARTIDA</span>
              <div className="lobby-pick-options">
                <button type="button" className={'lobby-pick-choice '+(me?.characterId === 'rose' ? 'active' : '')} aria-pressed={me?.characterId === 'rose'} onClick={() => changeLobbyCharacter('rose')}>✧ Guerreira das Rosas</button>
                <button type="button" className={'lobby-pick-choice '+(me?.characterId === 'wanderer' ? 'active' : '')} aria-pressed={me?.characterId === 'wanderer'} onClick={() => changeLobbyCharacter('wanderer')}>◇ Viajante</button>
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
            <GameCanvas snapshotRef={snapshotRef} playerId={playerId} sendInput={sendInput} mobileRef={mobileRef} />
            {snapshot?.status === 'victory' && <div className="game-outcome"><h2>Missão concluída! ✦</h2><p>O Bosque dos Sonhos voltou a brilhar.</p><button className="button button-primary" onClick={disconnect}>Voltar ao início</button></div>}
            {snapshot?.status === 'defeat' && <div className="game-outcome"><h2>Os sonhos resistem...</h2><p>Reúna seus aliados e tente novamente.</p><button className="button button-primary" onClick={disconnect}>Voltar ao início</button></div>}
          </section>
          <div className="game-bottom">
            <div className="stats"><span>♥ VIDA <strong>{me?.hp ?? 100}/100</strong></span><span>✧ PONTOS <strong>{me?.score ?? 0}</strong></span><span>⚔ INIMIGOS <strong>{snapshot?.remaining ?? 0}</strong></span></div>
            <div className="controls-legend"><span>A / D · Mover</span><span>W / Espaço · Pular</span><span>J · Atacar</span><span>K · Especial</span></div>
          </div>
          <div className="touch-controls" aria-label="Controles para dispositivos móveis">
            <div className="touch-group">
              {([['left','◀'],['right','▶'],['jump','↑']] as const).map(([key,label]) => <button key={key} className="touch-key" aria-label={key} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); touch(key,true); }} onPointerUp={() => touch(key,false)} onPointerCancel={() => touch(key,false)} onLostPointerCapture={() => touch(key,false)}>{label}</button>)}
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
        />
      ) : (
        <main id="inicio">
          <section className="hero">
            <div className="hero-art" aria-hidden="true"><div className="moon"/><div className="mountain mountain-back"/><div className="mountain mountain-front"/><div className="hero-glow"/><div className="hero-gate">✧</div><div className="hero-stars">✦　·　✧　　　✦　·　✧</div></div>
            <div className="hero-content">
              <span className="eyebrow">✦ UMA NOVA AVENTURA ESTÁ DESPERTANDO</span>
              <h1>Todo sonho merece <em>uma segunda chance.</em></h1>
              <p>Explore reinos esquecidos, domine combos e reúna seus amigos em um RPG de ação 2D cooperativo que nasce de um sonho antigo.</p>
              <div className="hero-buttons"><button type="button" onClick={() => openCharacterSelect('create')} className="button button-primary">✧ Selecionar personagem <span>→</span></button><a href="#universo" className="button button-outline">Descobrir o mundo</a></div>
              <div className="hero-details"><span><b>2D</b> ação e plataformas</span><span><b>4</b> jogadores por sala</span><span><b>α</b> pré-alfa</span></div>
            </div>
          </section>
          <section className="feature-section" id="universo">
            <div className="section-heading"><span className="eyebrow">✦ UM MUNDO À SUA ESPERA</span><h2>A aventura começa aqui</h2><p>O espírito dos jogos cooperativos clássicos, reinventado em um universo original.</p></div>
            <div className="features"><Feature icon="⚔" title="Combate que responde" description="Saltos, ataques e habilidades em masmorras 2D com física e combate controlados pelo servidor."/><Feature icon="♜" title="Jogue com amigos" description="Crie uma sala, compartilhe o código e avance ao lado de até três outros aventureiros."/><Feature icon="✧" title="Seu sonho, sua jornada" description="Três ondas de inimigos e um chefe na primeira missão. Mais mundos e classes estão a caminho."/></div>
          </section>
          <section id="jogar" className="play-section">
            <div className="play-copy"><span className="eyebrow">✦ PORTAL DE AVENTUREIROS</span><h2>Pronto para atravessar o portal?</h2><p>Escolha um nome e crie uma sala para convidar seus amigos. Você também pode entrar usando um código recebido.</p><div className="online-tip"><span className={websocketUrl ? 'signal signal-ready' : 'signal'} />{websocketUrl ? 'Servidor configurado · poderá despertar após um período inativo' : 'Servidor multiplayer ainda não configurado nesta publicação'}</div>
              <section className="local-progress" aria-label="Minha jornada salva no navegador">
                <div className="local-progress-title"><span>✧</span><h3>Minha jornada local</h3></div>
                <div className="local-progress-stats">
                  <div><strong>{localProfile.victories}</strong><span>Vitórias</span></div>
                  <div><strong>{localProfile.defeats}</strong><span>Derrotas</span></div>
                  <div><strong>{localProfile.lastRoom || '—'}</strong><span>Última sala</span></div>
                </div>
                <p>Salvo somente neste navegador (localStorage). Não é uma conta, não sincroniza entre aparelhos e não restaura salas encerradas.</p>
                <button type="button" className="local-reset" onClick={resetLocalHistory}>Apagar meus dados locais</button>
              </section>
            </div>
            <form className="join-card" onSubmit={join}>
              <div className="card-heading"><span className="card-icon">✧</span><div><h3>Entrar no Re:Dream</h3><p>Versão pré-alfa · gratuito</p></div></div>
              <label htmlFor="nickname">NOME DE AVENTUREIRO</label><input id="nickname" value={name} onChange={e => setName(e.target.value)} maxLength={20} minLength={2} placeholder="Seu apelido" autoComplete="nickname" required />
              <button className="button button-primary button-full" type="button" onClick={() => openCharacterSelect('create')} disabled={connection === 'connecting'}>✦ Escolher personagem</button>
              <div className="or"><span>ou entre com um convite</span></div>
              <label htmlFor="roomcode">CÓDIGO DA SALA</label><div className="join-row"><input id="roomcode" value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase())} maxLength={8} placeholder="Ex.: DREAM1"/><button className="button button-outline" type="submit" disabled={connection === 'connecting'}>Entrar →</button></div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <p className="form-hint">Controles: A/D mover · W pular · J atacar · K especial</p>
            </form>
          </section>
          <section className="closing"><span>✧</span><h2>O mundo estava apenas esperando você despertar.</h2><p>Re:Dream · O Recomeço de um Sonho</p></section>
        </main>
      )}
      <footer><span className="brand"><span className="brand-mark">✧</span> Re<span className="brand-accent">:</span>Dream</span><span>Projeto independente em desenvolvimento · pré-alfa</span><a href="https://github.com/HelioConde/Re-Dream" target="_blank" rel="noreferrer">Código no GitHub ↗</a></footer>
    </div>
  );
}
