import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { GameRoom, isCharacterId, type Control } from './sim.js';

const port = Number(process.env.PORT || 3001);
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
const rooms = new Map<string, GameRoom>();
type Peer = { id: string; room?: GameRoom; alive: boolean; window: number; count: number };
const peers = new Map<WebSocket, Peer>();

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, connections: peers.size }));
    return;
  }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });

function makeCode() {
  let code = '';
  do { code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); } while (rooms.has(code));
  return code;
}
function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  const origin = request.headers.origin || '';
  if (pathname !== '/ws' || (allowedOrigins.size && !allowedOrigins.has(origin))) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, client => wss.emit('connection', client));
});

wss.on('connection', ws => {
  const peer: Peer = { id: randomUUID(), alive: true, window: Date.now(), count: 0 };
  peers.set(ws, peer);
  ws.on('pong', () => { peer.alive = true; });
  send(ws, { type: 'welcome', id: peer.id });
  ws.on('message', raw => {
    if (Buffer.byteLength(raw.toString(), 'utf8') > 512) { ws.close(1009, 'Mensagem muito grande'); return; }
    const now = Date.now();
    if (now - peer.window > 1000) { peer.window = now; peer.count = 0; }
    if (++peer.count > 50) { ws.close(1008, 'Limite de mensagens excedido'); return; }
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()) as Record<string, unknown>; }
    catch { send(ws, { type: 'error', message: 'Mensagem inválida.' }); return; }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'join') {
      if (peer.room) { send(ws, { type: 'error', message: 'Você já está em uma sala.' }); return; }
      const name = typeof msg.name === 'string' ? msg.name.trim().slice(0, 20) : '';
      if (name.length < 2) { send(ws, { type: 'error', message: 'Apelido inválido.' }); return; }
      const supplied = typeof msg.room === 'string' ? msg.room.trim().toUpperCase() : '';
      if (supplied && !/^[A-Z0-9]{4,8}$/.test(supplied)) { send(ws, { type: 'error', message: 'Código da sala inválido.' }); return; }
      if (msg.characterId !== undefined && !isCharacterId(msg.characterId)) {
        send(ws, { type: 'error', message: 'Personagem inválido.' }); return;
      }
      const selectedCharacter = isCharacterId(msg.characterId) ? msg.characterId : 'aren';
      const code = supplied || makeCode();
      let room = rooms.get(code);
      if (!room && supplied) { send(ws, { type: 'error', message: 'Sala não encontrada.' }); return; }
      if (!room) { room = new GameRoom(code); rooms.set(code, room); }
      try { room.addPlayer(peer.id, name, selectedCharacter); }
      catch (err) { send(ws, { type: 'error', message: (err as Error).message }); return; }
      peer.room = room;
      send(ws, { type: 'joined', id: peer.id, room: code });
      send(ws, room.snapshot());
    } else if (msg.type === 'select' && peer.room) {
      if (!peer.room.selectCharacter(peer.id, msg.characterId))
        send(ws, { type: 'error', message: 'Não é possível trocar de personagem agora.' });
    } else if (msg.type === 'start' && peer.room) {
      if (!peer.room.start(peer.id)) send(ws, { type: 'error', message: 'Somente o líder pode iniciar uma sala no lobby.' });
    } else if (msg.type === 'input' && peer.room) {
      peer.room.setInput(peer.id, msg as unknown as Control);
    }
  });
  ws.on('close', () => {
    peers.delete(ws);
    if (peer.room) {
      peer.room.removePlayer(peer.id);
      if (peer.room.size === 0) rooms.delete(peer.room.code);
    }
  });
  ws.on('error', error => console.warn('WebSocket:', error.message));
});

let frame = 0;
setInterval(() => {
  for (const room of rooms.values()) room.step(1 / 30);
  if (++frame % 3 === 0) {
    for (const [ws, peer] of peers) if (peer.room) send(ws, peer.room.snapshot());
  }
}, 1000 / 30);

setInterval(() => {
  for (const [ws, peer] of peers) {
    if (!peer.alive) { ws.terminate(); continue; }
    peer.alive = false;
    ws.ping();
  }
}, 30000);

httpServer.listen(port, '0.0.0.0', () => {
  console.log('Re:Dream WebSocket em http://localhost:' + port + ' (WS: /ws)');
  if (!allowedOrigins.size) console.warn('ALLOWED_ORIGINS vazio: configure origens permitidas em produção.');
});
