import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { WebSocket } from 'ws';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const listener = createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address();
      if (!address || typeof address === 'string') return reject(Error('No port'));
      listener.close(() => resolve(address.port));
    });
  });
}

type Message = { type: string; id?: string; room?: string; players?: { id: string; x: number }[]; message?: string };
function waitFor(ws: WebSocket, predicate: (value: Message) => boolean, ms = 5000): Promise<Message> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(Error('Timed out waiting for WebSocket message')); }, ms);
    const handle = (bytes: Buffer) => {
      let obj: Message;
      try { obj = JSON.parse(bytes.toString()) as Message; } catch { return; }
      if (predicate(obj)) { cleanup(); resolve(obj); }
    };
    const closed = () => { cleanup(); reject(Error('WebSocket closed early')); };
    const cleanup = () => { clearTimeout(timer); ws.off('message', handle); ws.off('close', closed); };
    ws.on('message', handle);
    ws.on('close', closed);
  });
}

async function connectAndJoin(url: string, name: string, room?: string) {
  const ws = new WebSocket(url, { origin: 'https://helioconde.github.io' });
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  const response = waitFor(ws, m => m.type === 'joined' || m.type === 'error');
  ws.send(JSON.stringify({ type: 'join', name, room }));
  const joined = await response;
  if (joined.type === 'error' || !joined.room || !joined.id) throw Error(joined.message || 'No room');
  return { ws, id: joined.id, room: joined.room };
}

test('duas conexões WebSocket compartilham a mesma sala e veem movimento autoritativo', { timeout: 20000 }, async () => {
  const port = await freePort();
  const server = spawn(process.execPath, ['--import', 'tsx', './src/index.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), ALLOWED_ORIGINS: 'https://helioconde.github.io' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.on('data', chunk => { logs += chunk.toString(); });
  server.stderr.on('data', chunk => { logs += chunk.toString(); });
  const sockets: WebSocket[] = [];
  try {
    let live = false;
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null) throw Error('Server exited: ' + logs);
      try {
        const res = await fetch('http://127.0.0.1:' + port + '/health');
        if (res.ok) {
          const health = await res.json() as { ok: boolean };
          assert.equal(health.ok, true);
          live = true; break;
        }
      } catch { /* server starting */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(live, 'Server failed health check: ' + logs);

    const first = await connectAndJoin('ws://127.0.0.1:' + port + '/ws', 'PlayerOne');
    sockets.push(first.ws);
    const bothVisible = waitFor(first.ws, m => m.type === 'snapshot' && (m.players?.length ?? 0) === 2);
    const second = await connectAndJoin('ws://127.0.0.1:' + port + '/ws', 'PlayerTwo', first.room);
    sockets.push(second.ws);
    assert.equal(first.room, second.room);
    assert.notEqual(first.id, second.id);
    const snapshot = await bothVisible;
    assert.equal(snapshot.players?.length, 2);
    assert.equal((snapshot as Message & { status?: string }).status, 'lobby');
    const startX = snapshot.players?.find(p => p.id === first.id)?.x ?? 0;
    const started = waitFor(first.ws, m => (m as Message & { status?: string }).status === 'playing');
    first.ws.send(JSON.stringify({ type: 'start' }));
    await started;
    const moved = waitFor(first.ws, m => m.type === 'snapshot' && (
      (m.players?.find(p => p.id === first.id)?.x ?? startX) > startX + 15
    ), 7000);
    first.ws.send(JSON.stringify({ type: 'input', left: false, right: true, jump: false, attack: false, skill: false }));
    await moved;
  } finally {
    for (const ws of sockets) ws.terminate();
    server.kill();
  }
});
