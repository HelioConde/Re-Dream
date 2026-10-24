import { useState } from 'react';
import type { FormEvent } from 'react';
import { CHARACTERS } from './characters';
import type { CharacterId } from './protocol';

type Props = {
  selected: CharacterId;
  nickname: string;
  roomCode: string;
  intent: 'create' | 'join';
  busy: boolean;
  error: string;
  onSelect: (id: CharacterId) => void;
  onNickname: (name: string) => void;
  onRoomCode: (code: string) => void;
  onBack: () => void;
  onConfirm: () => void;
};

export default function CharacterSelect({
  selected, nickname, roomCode, intent, busy, error,
  onSelect, onNickname, onRoomCode, onBack, onConfirm,
}: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const chosen = CHARACTERS.find(c => c.id === selected) || CHARACTERS[0];
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onConfirm(); };

  return <main className="character-select" id="personagens">
    <div className="select-heading">
      <span className="eyebrow">✧ RE:DREAM · SELEÇÃO DE AVENTUREIRO</span>
      <h1>Escolha seu personagem</h1>
      <p>Selecione um dos {CHARACTERS.length} personagens provisórios e prepare sua aventura cooperativa. O Fighter original substituirá as opções de teste quando os sprites estiverem prontos.</p>
    </div>
    <div className="select-layout">
      <section className="character-list" aria-label="Personagens disponíveis">
        {CHARACTERS.map(character => <button
          type="button"
          key={character.id}
          className={'character-card ' + (selected === character.id ? 'selected' : '')}
          aria-pressed={selected === character.id}
          onClick={() => onSelect(character.id)}
        >
          <span className={'character-thumbnail sprite-' + character.id} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${character.preview})`, backgroundSize: character.artSize, backgroundPosition: character.previewPosition || '0 0' }} role="img" aria-label={'Sprite de ' + character.name}/>
          <span className="character-card-copy">
            <strong>{character.name}</strong>
            <small>{character.subtitle}</small>
          </span>
          <span className="character-check">{selected === character.id ? '✓' : '○'}</span>
        </button>)}
        <div className="future-characters">
          <span aria-hidden="true">✧</span>
          <strong>Fighter original em produção</strong>
          <p>A base e a primeira armadura foram criadas no PixelLab. As animações equipadas ainda precisam ser exportadas.</p>
        </div>
      </section>
      <section className="character-stage" aria-label="Prévia do personagem selecionado">
        <div className="character-stage-art">
          <span className="character-stage-moon" aria-hidden="true">✧</span>
          <div key={chosen.id} className={'character-large sprite-' + chosen.id} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}${chosen.preview})`, backgroundSize: chosen.artSize, backgroundPosition: chosen.previewPosition || '0 0' }} role="img" aria-label={'Prévia de ' + chosen.name}/>
          <span className="character-stage-ground"/>
        </div>
        <div className="character-stage-details">
          <span className="eyebrow">PERSONAGEM SELECIONADO</span>
          <h2>{chosen.name}</h2>
          <p>{chosen.description}</p>
          <button type="button" className="character-source" aria-expanded={showDetails} onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Ocultar informações −' : 'Ver origem dos sprites +'}
          </button>
          {showDetails && <p className="character-credit">{chosen.origin}. Alguns movimentos ainda usam efeitos provisórios.</p>}
        </div>
      </section>
    </div>
    <form className="character-enter" onSubmit={submit}>
      <div className="character-inputs">
        <label htmlFor="character-nickname">NOME DO AVENTUREIRO
          <input id="character-nickname" minLength={2} maxLength={20} value={nickname} onChange={e => onNickname(e.target.value)} placeholder="Seu apelido" required />
        </label>
        {intent === 'join' && <label htmlFor="character-room">CÓDIGO DA SALA
          <input id="character-room" maxLength={8} pattern="[A-Za-z0-9]{4,8}" value={roomCode} onChange={e => onRoomCode(e.target.value.toUpperCase())} placeholder="Ex.: D60AC5" required />
        </label>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="character-cta">
        <button type="button" className="button button-ghost" onClick={onBack}>← Voltar</button>
        <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Conectando...' : intent === 'join' ? 'CONFIRMAR E ENTRAR →' : 'CONFIRMAR E CRIAR SALA →'}</button>
      </div>
    </form>
    <p className="character-disclaimer">Pré-alfa não comercial: algumas opções têm somente pose estática ou movimentos incompletos.
    Personagens usam os mesmos atributos. Preferências salvas no seu navegador, sem banco de dados.
    Créditos de cada pacote disponíveis em "Ver origem dos sprites".</p>
  </main>;
}
