import { useState } from 'react';
import { characterName, getCharacter } from './characters';
import type { LocalProfile } from './localProfile';
import type { CharacterId } from './protocol';

type Page = 'welcome' | 'portal' | 'world' | 'inventory';

type Props = {
  profile: LocalProfile;
  characterId: CharacterId;
  onlineConfigured: boolean;
  onPlay: () => void;
  onJoin: () => void;
  onClearLocal: () => void;
};

const REGIONS = [
  { id: 'bosque', name: 'Bosque dos Sonhos', subtitle: 'Primeira missão · 3 ondas e 1 chefe', x: 23, y: 62, status: 'Disponível', icon: '✦' },
  { id: 'vale', name: 'Vale do Crepúsculo', subtitle: 'Nova região em desenvolvimento', x: 46, y: 40, status: 'Em breve', icon: '◆' },
  { id: 'fortaleza', name: 'Fortaleza Celeste', subtitle: 'Nova região em desenvolvimento', x: 72, y: 27, status: 'Em breve', icon: '♜' },
  { id: 'ruinas', name: 'Ruínas da Aurora', subtitle: 'Nova região em desenvolvimento', x: 78, y: 69, status: 'Em breve', icon: '✧' },
] as const;

const SLOTS = [
  { icon: '♛', name: 'Cabeça' },
  { icon: '◈', name: 'Peitoral' },
  { icon: '✊', name: 'Manoplas' },
  { icon: '◇', name: 'Calça' },
  { icon: '♢', name: 'Botas' },
  { icon: '✦', name: 'Acessório' },
];

function SkyRealm() {
  return <div className="rd-sky" aria-hidden="true">
    <div className="rd-sky-stars" />
    <div className="rd-sky-orb" />
    <div className="rd-island rd-island-left" />
    <div className="rd-island rd-island-right" />
    <div className="rd-castle">
      <i className="rd-tower rd-tower-left" /><i className="rd-tower rd-tower-center" />
      <i className="rd-tower rd-tower-right" /><i className="rd-castle-core" />
      <i className="rd-castle-gate" />
    </div>
    <div className="rd-sky-cloud rd-sky-cloud-one" />
    <div className="rd-sky-cloud rd-sky-cloud-two" />
    <div className="rd-sky-ridge" />
  </div>;
}

function DreamMap() {
  return <svg className="rd-map-art" viewBox="0 0 1000 570" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="land" x1="0" x2=".9" y1="0" y2="1">
        <stop offset="0%" stopColor="#a8be7c" />
        <stop offset="48%" stopColor="#668b5a" />
        <stop offset="100%" stopColor="#405c51" />
      </linearGradient>
      <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
        <stop stopColor="#5eb4c2" /><stop offset="100%" stopColor="#163c6e" />
      </linearGradient>
      <filter id="terrain-shadow"><feDropShadow dx="0" dy="15" stdDeviation="12" floodColor="#031526" floodOpacity=".55" /></filter>
    </defs>
    <rect width="1000" height="570" fill="url(#sea)"/>
    <g opacity=".19" fill="none" stroke="#b8ecf1" strokeWidth="2">
      <path d="M0 95 Q210 15 392 110 T760 115 T1020 83"/><path d="M-20 430 Q240 335 450 426 T1030 395"/>
      <path d="M-30 255 Q240 190 460 280 T1020 265"/>
    </g>
    <path filter="url(#terrain-shadow)" fill="#e8d8a9" d="M40 125 120 65 235 77 310 41 432 87 494 53 612 92 696 85 815 130 870 215 942 255 927 358 852 436 738 471 658 532 549 498 420 531 344 492 208 509 128 451 74 373 27 290Z"/>
    <path fill="url(#land)" d="M51 139 126 82 232 92 311 56 427 106 497 70 603 110 693 101 800 142 855 220 918 260 904 353 843 422 728 454 658 513 542 479 423 512 338 470 215 488 143 433 89 364 42 285Z"/>
    <path fill="#2a6349" opacity=".6" d="M51 139 167 181 151 276 211 340 173 454 143 433 89 364 42 285ZM651 513 674 411 752 339 858 333 904 353 843 422 728 454Z"/>
    <path fill="#b99463" opacity=".64" d="M205 124 343 137 432 118 550 192 556 324 476 399 338 390 225 307Z"/>
    <g fill="#d6d9ad" stroke="#83987d" strokeWidth="3">
      <path d="m298 173 47-96 43 96-23-9-19-38-24 43Z"/>
      <path d="m392 205 54-122 48 122-23-13-25-58-28 59Z"/>
      <path d="m462 173 42-92 40 92-23-10-17-37-21 42Z"/>
      <path d="m560 230 51-113 46 113-23-13-23-50-26 53Z"/>
      <path d="m624 254 43-95 45 95-25-10-19-40-18 45Z"/>
    </g>
    <g fill="#1d5946" opacity=".82">
      <circle cx="164" cy="216" r="45"/><circle cx="200" cy="265" r="49"/><circle cx="136" cy="318" r="42"/>
      <circle cx="262" cy="399" r="52"/><circle cx="338" cy="424" r="37"/><circle cx="715" cy="386" r="42"/>
      <circle cx="785" cy="346" r="39"/><circle cx="809" cy="276" r="28"/>
      <circle cx="560" cy="427" r="34"/>
    </g>
    <path d="M225 355 Q332 325 440 235 Q560 182 700 155 M440 235 Q522 335 775 393" fill="none" stroke="#f9efc8" strokeWidth="12" strokeLinecap="round" strokeDasharray="2 20" opacity=".82"/>
    <g fill="#e6f4ca" opacity=".65"><circle cx="97" cy="185" r="3"/><circle cx="275" cy="250" r="4"/><circle cx="744" cy="200" r="4"/><circle cx="611" cy="369" r="4"/></g>
  </svg>;
}

export default function AdventureHub({ profile, characterId, onlineConfigured, onPlay, onJoin, onClearLocal }: Props) {
  const [page, setPage] = useState<Page>('welcome');
  const [selectedRegion, setSelectedRegion] = useState<(typeof REGIONS)[number]['id']>('bosque');
  const region = REGIONS.find(item => item.id === selectedRegion) || REGIONS[0];
  const character = getCharacter(characterId);
  const previewStyle = {
    backgroundImage: 'url(' + import.meta.env.BASE_URL + character.preview + ')',
    backgroundSize: character.artSize,
    backgroundPosition: character.previewPosition || '0 0',
  };

  if (page === 'welcome') return <main className="rd-welcome">
    <SkyRealm/>
    <div className="rd-welcome-top"><span>✦ RE:DREAM</span><span>VERSÃO PRÉ-ALFA · WEB</span></div>
    <section className="rd-welcome-center">
      <p className="rd-overline">UM NOVO MUNDO ESTÁ DESPERTANDO</p>
      <h1>Re<span>:</span>Dream</h1>
      <p className="rd-welcome-tagline">O Recomeço de um Sonho</p>
      <div className="rd-welcome-line"/>
      <p className="rd-welcome-description">Um RPG de ação 2D para explorar, lutar e despertar novos caminhos com seus amigos.</p>
      <button type="button" className="rd-action rd-action-gold rd-action-xl" onClick={() => setPage('portal')}>ENTRAR NO JOGO <span aria-hidden="true">➜</span></button>
      <p className="rd-welcome-note">Experiência em desenvolvimento · navegador e dispositivos móveis</p>
    </section>
    <div className="rd-welcome-bottom"><span>✧ UM UNIVERSO ORIGINAL</span><span>RE:DREAM © PRÉ-ALFA</span></div>
  </main>;

  return <main className={'rd-client rd-page-' + page}>
    <SkyRealm/>
    <header className="rd-client-bar">
      <button className="rd-client-brand" onClick={() => setPage('portal')} aria-label="Re:Dream, voltar ao portal">✦ <strong>Re<span>:</span>Dream</strong></button>
      <nav aria-label="Áreas do jogo" className="rd-client-nav">
        <button type="button" className={page === 'portal' ? 'active' : ''} aria-pressed={page === 'portal'} onClick={() => setPage('portal')}>⌂ <span>Início</span></button>
        <button type="button" className={page === 'world' ? 'active' : ''} aria-pressed={page === 'world'} onClick={() => setPage('world')}>⚑ <span>Missões</span></button>
        <button type="button" className={page === 'inventory' ? 'active' : ''} aria-pressed={page === 'inventory'} onClick={() => setPage('inventory')}>◈ <span>Inventário</span></button>
      </nav>
      <div className="rd-client-right"><span className="rd-alpha">PRÉ-ALFA</span><button className="rd-exit" onClick={() => setPage('welcome')}>Sair <span aria-hidden="true">↗</span></button></div>
    </header>

    {page === 'portal' && <section className="rd-portal-content">
      <div className="rd-portal-heading"><span className="rd-overline">PORTAL DOS AVENTUREIROS</span><h1>Bem-vindo ao <span>Re:Dream</span></h1><p>Seu próximo capítulo começa aqui.</p></div>
      <div className="rd-notice-frame">
        <div className="rd-notice-top"><span>✧ NOVIDADES DO REINO</span><span className="rd-pill">EM DESENVOLVIMENTO</span></div>
        <div className="rd-notice-body">
          <div className="rd-notice-illustration"><i className="rd-notice-moon"/><i className="rd-notice-tree"/><i className="rd-notice-floor"/><span className="rd-notice-rune">✧</span></div>
          <div className="rd-notice-copy"><span className="rd-overline">PRIMEIRA AVENTURA</span><h2>O Bosque dos Sonhos</h2><p>Entre em uma masmorra cooperativa. Enfrente três ondas de monstros e um chefe ao lado dos seus aliados.</p><button onClick={() => setPage('world')} type="button">Ver mapa de missões →</button></div>
        </div>
        <div className="rd-notice-pagination"><span className="active"/><span/><span/></div>
      </div>
      <div className="rd-portal-actions"><button type="button" className="rd-action rd-action-gold rd-action-xl" onClick={onPlay}>✦ JOGAR AGORA <span>➜</span></button><button type="button" className="rd-action rd-action-blue" onClick={onJoin}>⌁ ENTRAR COM CÓDIGO</button></div>
      <div className="rd-portal-status"><span className={'rd-light ' + (onlineConfigured ? 'ready' : '')}/>{onlineConfigured ? 'Servidor multiplayer configurado · conexão ao entrar na sala' : 'Servidor multiplayer não configurado'}<span className="rd-status-separator">·</span> Até 4 jogadores por sala</div>
    </section>}

    {page === 'world' && <section className="rd-world-content">
      <div className="rd-screen-heading"><div><span className="rd-overline">MAPA DO MUNDO · MISSÕES</span><h1>Terras do Despertar</h1></div><button className="rd-action rd-action-blue" onClick={() => setPage('portal')}>← Voltar</button></div>
      <div className="rd-world-shell">
        <div className="rd-world-map">
          <DreamMap/>
          {REGIONS.map(item => <button key={item.id} type="button" className={'rd-world-pin ' + (selectedRegion === item.id ? 'selected ' : '') + (item.id === 'bosque' ? 'available' : 'locked')} onClick={() => setSelectedRegion(item.id)} style={{ left: item.x + '%', top: item.y + '%' }} aria-pressed={selectedRegion === item.id} aria-label={item.name + ' · ' + item.status}>
            <span className="rd-world-pin-icon">{item.icon}</span><span className="rd-world-pin-name">{item.name}</span>
          </button>)}
          <span className="rd-map-wind" aria-hidden="true">✧</span>
        </div>
        <aside className="rd-mission-sidebar"><span className="rd-overline">MISSÃO SELECIONADA</span><h2>{region.name}</h2><span className={'rd-mission-tag ' + (region.id === 'bosque' ? 'available' : '')}>{region.status}</span><p>{region.subtitle}</p><div className="rd-mission-divider"/><h3>{region.id === 'bosque' ? 'Bosque dos Sonhos' : 'Região futura'}</h3><p>{region.id === 'bosque' ? 'Uma aventura cooperativa com inimigos e um chefão. A missão já está implementada nesta versão de teste.' : 'Esta região aparece apenas como prévia do mapa. Ainda não existe uma missão jogável.'}</p><div className="rd-mission-meta"><span>◈ Modo</span><b>{region.id === 'bosque' ? 'Cooperativo' : 'Indisponível'}</b></div><div className="rd-mission-meta"><span>♜ Equipe</span><b>{region.id === 'bosque' ? '1–4 jogadores' : '—'}</b></div><button type="button" className="rd-action rd-action-gold" onClick={onPlay} disabled={region.id !== 'bosque'}>{region.id === 'bosque' ? 'ESCOLHER PERSONAGEM →' : 'EM BREVE'}</button></aside>
      </div>
    </section>}

    {page === 'inventory' && <section className="rd-inventory-content">
      <div className="rd-screen-heading"><div><span className="rd-overline">AVENTUREIRO · EQUIPAMENTOS</span><h1>Inventário</h1></div><button className="rd-action rd-action-blue" onClick={() => setPage('portal')}>← Voltar</button></div>
      <div className="rd-inventory-layout">
        <section className="rd-inventory-character"><div className="rd-inventory-section-title">◈ MEU AVENTUREIRO <span>PRÉVIA</span></div><div className="rd-paperdoll">
          <div className="rd-equip-column">{SLOTS.slice(0,3).map(slot => <div className="rd-equip-slot" key={slot.name} title={slot.name + ' · em desenvolvimento'}><span>{slot.icon}</span><small>{slot.name}</small></div>)}</div>
          <div className="rd-paperdoll-stage"><span className="rd-paperdoll-glow"/><div className={'character-large sprite-' + characterId} style={previewStyle} role="img" aria-label={'Prévia do personagem ' + characterName(characterId)}/><span className="rd-paperdoll-ground"/></div>
          <div className="rd-equip-column">{SLOTS.slice(3).map(slot => <div className="rd-equip-slot" key={slot.name} title={slot.name + ' · em desenvolvimento'}><span>{slot.icon}</span><small>{slot.name}</small></div>)}</div>
        </div><div className="rd-inventory-summary"><strong>{characterName(characterId)}</strong><span>Personagem provisório · equipamentos ainda não disponíveis</span></div>
          <div className="rd-progress-list"><div><span>Vitórias locais</span><b>{profile.victories}</b></div><div><span>Derrotas locais</span><b>{profile.defeats}</b></div><div><span>Última sala</span><b>{profile.lastRoom || '—'}</b></div></div>
        </section>
        <section className="rd-inventory-bag"><div className="rd-inventory-section-title">▦ MOCHILA <span>0 ITENS · PROTÓTIPO</span></div><div className="rd-inventory-toolbar"><span>Todos os itens</span><span>✧ Slot de equipamento</span></div><div className="rd-bag-grid" aria-label="Espaços vazios no inventário">{Array.from({ length: 35 }, (_, i) => <span className="rd-bag-slot" key={i}/>)}</div><div className="rd-inventory-message"><strong>Equipamentos modulares em preparação</strong><p>A armadura Fighter Iniciante foi concebida no PixelLab. Antes de ativar a troca de manoplas, peitoral e botas, precisamos dos sprites transparentes e animados dessas peças. Nenhum item fictício foi adicionado ao inventário.</p></div><div className="rd-inventory-actions"><button type="button" className="rd-action rd-action-blue" onClick={onPlay}>Selecionar personagem</button><button type="button" className="rd-text-button" onClick={onClearLocal}>Limpar histórico local</button></div></section>
      </div>
    </section>}

    <footer className="rd-client-footer"><span>RE:DREAM · O RECOMEÇO DE UM SONHO</span><span>Protótipo independente · Não utiliza recursos visuais de Grand Chase</span></footer>
  </main>;
}
