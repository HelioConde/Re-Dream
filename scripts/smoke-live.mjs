// One-shot external connection test. Does not require a database.
import WebSocket from 'ws';

const url = process.env.TARGET_WS_URL || 'wss://re-dream.onrender.com/ws';
const origin = process.env.TARGET_ORIGIN || 'https://helioconde.github.io';
const httpUrl = new URL(url);
httpUrl.protocol = url.startsWith('wss:') ? 'https:' : 'http:';
httpUrl.pathname = '/health';
const controller = new AbortController();
const abortTimer = setTimeout(() => controller.abort(), 115000);

function waitMessage(ws, predicate, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(Error('Timeout on WS response')); }, timeoutMs);
    const listener = bytes => {
      let data;
      try { data = JSON.parse(bytes.toString()); } catch { return; }
      if (predicate(data)) { cleanup(); resolve(data); }
    };
    const closed = () => { cleanup(); reject(Error('WS disconnected')); };
    const cleanup = () => { clearTimeout(timeout); ws.off('message', listener); ws.off('close', closed); };
    ws.on('message', listener);
    ws.on('close', closed);
  });
}
async function join(name, room) {
  const ws = new WebSocket(url, { origin, handshakeTimeout: 115000 });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const joined = waitMessage(ws, x => x.type === 'joined' || x.type === 'error');
  ws.send(JSON.stringify({ type: 'join', name, room }));
  const msg = await joined;
  if (msg.type !== 'joined') { ws.terminate(); throw Error(msg.message || 'Join refused'); }
  return { ws, ...msg };
}
let a, b;
try {
  console.log('Checking health at', httpUrl.toString());
  let healthy = false;
  let lastError;
  // Free Render services may be asleep or briefly redeploying.
  for (let attempt = 1; attempt <= 7 && !controller.signal.aborted; attempt++) {
    try {
      const response = await fetch(httpUrl, { signal: controller.signal });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const health = await response.json();
      if (!health.ok) throw Error('Health endpoint reported unavailable');
      healthy = true;
      break;
    } catch (err) {
      lastError = err;
      console.warn('Health attempt', attempt, 'failed:', String(err));
      if (attempt < 7 && !controller.signal.aborted) await new Promise(resolve => setTimeout(resolve, 2500 * attempt));
    }
  }
  if (!healthy) throw Error('Render health unavailable: ' + String(lastError));
  console.log('Health OK. Connecting WebSocket...');
  a = await join('SmokeTestOne');
  const together = waitMessage(a.ws, m => m.type === 'snapshot' && m.players?.length === 2);
  b = await join('SmokeTestTwo', a.room);
  const lobbyState = await together;
  if (lobbyState.status !== 'lobby') throw Error('Expected staging lobby before combat');
  if (a.room !== b.room) throw Error('Joined different rooms');
  const started = waitMessage(b.ws, msg => msg.type === 'snapshot' && msg.status === 'playing');
  a.ws.send(JSON.stringify({ type: 'start' }));
  await started;
  console.log('PASS: two players met in lobby and host started room', a.room);
} finally {
  clearTimeout(abortTimer);
  a?.ws.terminate();
  b?.ws.terminate();
}
