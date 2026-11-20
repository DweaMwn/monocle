'use strict';
/**
 * huddle. — live rooms that disappear when the conversation goes quiet.
 *
 * One Node process: serves /public and runs a WebSocket server on /ws.
 * All state is in memory on purpose — rooms and messages are ephemeral.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

// ---- Room rules -----------------------------------------------------------
const INITIAL_MS = 3 * 60 * 1000; // a new room lives 3 minutes
const BONUS_MS = 30 * 1000; // every message adds 30 seconds
const MAX_ROOMS = 200;
const MAX_TITLE = 80;
const MAX_TEXT = 500;
const MAX_NAME = 20;
const MAX_VOICE_SECONDS = 60;
const MAX_VOICE_B64 = 1_200_000; // ~900 KB of audio
const MAX_HISTORY = 150;
const TOPICS = new Set(['football', 'music', 'anime', 'politics', 'gaming', 'everything']);
const AVATAR_COLORS = 6;
// Seat limits (chosen by the room's creator within these bounds)
const SPEAKER_SEATS = { min: 2, max: 10, def: 6 };
const LISTENER_SEATS = { min: 0, max: 30, def: 10 };
const seatCount = (v, { min, max, def }) => (Number.isInteger(v) ? Math.min(max, Math.max(min, v)) : def);

// ---- Static files ---------------------------------------------------------
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (pathname === '/') pathname = '/index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(pathname));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
});

// ---- State ----------------------------------------------------------------
/** @type {Set<Client>} */
const clients = new Set();
/** @type {Map<string, Room>} */
const rooms = new Map();

const uid = (n = 8) => crypto.randomBytes(n).toString('hex').slice(0, n);

function cleanText(s, max) {
  return String(s ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function initialsOf(name) {
  const parts = name.split(' ').filter(Boolean);
  const raw = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return raw.toUpperCase();
}

function colorOf(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h % AVATAR_COLORS;
}

function send(c, payload) {
  if (c.ws.readyState === 1) c.ws.send(JSON.stringify(payload));
}

function memberView(c) {
  return { id: c.id, name: c.name, initials: c.initials, ci: c.ci, role: c.role };
}

function roomMembers(room) {
  return [...room.members].map(memberView);
}

function lobbyView(room) {
  const members = roomMembers(room);
  const speakers = members.filter((m) => m.role === 'speaker');
  const listeners = members.filter((m) => m.role !== 'speaker');
  return {
    id: room.id,
    title: room.title,
    topic: room.topic,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    count: members.length,
    speakers: speakers.length,
    listeners: listeners.length,
    maxSpeakers: room.maxSpeakers,
    maxListeners: room.maxListeners,
    avatars: [...speakers, ...listeners].slice(0, 3).map((m) => ({ initials: m.initials, ci: m.ci })),
  };
}

function lobbySnapshot() {
  return [...rooms.values()].map(lobbyView);
}

// Coalesce bursts of changes into one lobby broadcast.
let lobbyTimer = null;
function scheduleLobby() {
  if (lobbyTimer) return;
  lobbyTimer = setTimeout(() => {
    lobbyTimer = null;
    const msg = { type: 'rooms', serverNow: Date.now(), rooms: lobbySnapshot() };
    for (const c of clients) if (!c.room) send(c, msg);
  }, 150);
}

function broadcast(room, payload) {
  for (const c of room.members) send(c, payload);
}

// ---- Room lifecycle -------------------------------------------------------
function leaveRoom(c) {
  const room = c.room;
  if (!room) return;
  room.members.delete(c);
  c.room = null;
  broadcast(room, { type: 'members', members: roomMembers(room) });
  scheduleLobby();
}

// Is there a free seat for `c` taking `role` in `room`? (Keeping your own role is always fine.)
function hasSeat(room, role, c) {
  if (room.members.has(c) && c.role === role) return true;
  let s = 0;
  let l = 0;
  for (const m of room.members) (m.role === 'speaker' ? s++ : l++);
  return role === 'speaker' ? s < room.maxSpeakers : l < room.maxListeners;
}

function joinRoom(c, room, role) {
  if (c.room && c.room !== room) leaveRoom(c);
  c.role = role === 'speaker' ? 'speaker' : 'listener';
  const already = room.members.has(c);
  room.members.add(c);
  c.room = room;
  send(c, {
    type: 'joined',
    me: c.id,
    serverNow: Date.now(),
    room: {
      id: room.id,
      title: room.title,
      topic: room.topic,
      expiresAt: room.expiresAt,
      maxSpeakers: room.maxSpeakers,
      maxListeners: room.maxListeners,
      members: roomMembers(room),
      messages: room.messages,
    },
  });
  if (!already) broadcast(room, { type: 'members', members: roomMembers(room) });
  scheduleLobby();
}

function closeRoom(room, reason) {
  rooms.delete(room.id);
  for (const c of room.members) {
    c.room = null;
    send(c, { type: 'room_closed', roomId: room.id, reason });
  }
  room.members.clear();
  scheduleLobby();
}

setInterval(() => {
  const now = Date.now();
  for (const room of [...rooms.values()]) {
    if (now >= room.expiresAt) closeRoom(room, 'quiet');
  }
}, 1000);

function postMessage(c, body) {
  const room = c.room;
  if (!room) return;
  if (c.role !== 'speaker') return send(c, { type: 'error', message: 'Join as a speaker to send messages.' });

  // light rate limit: 6 messages per 8 seconds
  const now = Date.now();
  c.stamps = (c.stamps || []).filter((t) => now - t < 8000);
  if (c.stamps.length >= 6) return send(c, { type: 'error', message: 'Slow down a little.' });
  c.stamps.push(now);

  const msg = {
    id: uid(10),
    from: c.id,
    name: c.name,
    initials: c.initials,
    ci: c.ci,
    ts: now,
    ...body,
  };
  room.messages.push(msg);
  if (room.messages.length > MAX_HISTORY) room.messages.shift();
  room.expiresAt += BONUS_MS;
  broadcast(room, { type: 'message', msg, expiresAt: room.expiresAt, serverNow: now });
  scheduleLobby();
}

// ---- Protocol -------------------------------------------------------------
function setIdentity(c, name) {
  const clean = cleanText(name, MAX_NAME) || 'Guest';
  c.name = clean;
  c.initials = initialsOf(clean);
  c.ci = colorOf(clean.toLowerCase());
}

function handle(c, m) {
  switch (m.type) {
    case 'create': {
      const title = cleanText(m.title, MAX_TITLE);
      if (title.length < 3) return send(c, { type: 'error', message: 'Give your room a title (3+ characters).' });
      if (!TOPICS.has(m.topic)) return send(c, { type: 'error', message: 'Pick a topic for your room.' });
      if (rooms.size >= MAX_ROOMS) return send(c, { type: 'error', message: 'Too many rooms right now. Try again soon.' });
      setIdentity(c, m.name);
      const room = {
        id: uid(8),
        title,
        topic: m.topic,
        createdAt: Date.now(),
        expiresAt: Date.now() + INITIAL_MS,
        maxSpeakers: seatCount(m.maxSpeakers, SPEAKER_SEATS),
        maxListeners: seatCount(m.maxListeners, LISTENER_SEATS),
        members: new Set(),
        messages: [],
      };
      rooms.set(room.id, room);
      joinRoom(c, room, 'speaker');
      break;
    }
    case 'join': {
      const room = rooms.get(String(m.roomId));
      if (!room) return send(c, { type: 'join_failed', roomId: String(m.roomId) });
      const role = m.role === 'speaker' ? 'speaker' : 'listener';
      if (!hasSeat(room, role, c)) return send(c, { type: 'join_failed', roomId: room.id, reason: 'full', role });
      setIdentity(c, m.name);
      joinRoom(c, room, role);
      break;
    }
    case 'role': {
      if (!c.room) return;
      const role = m.role === 'speaker' ? 'speaker' : 'listener';
      if (!hasSeat(c.room, role, c)) {
        return send(c, { type: 'error', message: role === 'speaker' ? 'Speaker seats are full right now.' : 'Listener seats are full right now.' });
      }
      c.role = role;
      broadcast(c.room, { type: 'members', members: roomMembers(c.room) });
      scheduleLobby();
      break;
    }
    case 'leave':
      leaveRoom(c);
      send(c, { type: 'rooms', serverNow: Date.now(), rooms: lobbySnapshot() });
      break;
    case 'chat': {
      const text = cleanText(m.text, MAX_TEXT);
      if (!text) return;
      postMessage(c, { kind: 'text', text });
      break;
    }
    case 'voice': {
      const dur = Number(m.dur);
      const mime = String(m.mime || '');
      const data = String(m.data || '');
      if (!/^audio\/[a-z0-9.+-]+/i.test(mime)) return;
      if (!data || data.length > MAX_VOICE_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
        return send(c, { type: 'error', message: 'That voice note is too long.' });
      }
      if (!(dur >= 0.5 && dur <= MAX_VOICE_SECONDS + 2)) return;
      postMessage(c, { kind: 'voice', mime: mime.split(';')[0], data, dur: Math.round(dur * 10) / 10 });
      break;
    }
  }
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1.6 * 1024 * 1024 });

wss.on('connection', (ws) => {
  const c = { id: uid(8), ws, room: null, role: 'listener', alive: true };
  setIdentity(c, 'Guest');
  clients.add(c);

  ws.on('pong', () => (c.alive = true));
  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m && typeof m === 'object') handle(c, m);
  });
  ws.on('close', () => {
    leaveRoom(c);
    clients.delete(c);
  });
  ws.on('error', () => {});

  send(c, { type: 'welcome', id: c.id, serverNow: Date.now(), rooms: lobbySnapshot() });
});

// Drop dead connections (mobile browsers vanish without saying goodbye).
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) {
      c.ws.terminate();
      continue;
    }
    c.alive = false;
    try {
      c.ws.ping();
    } catch {}
  }
}, 30000);

server.listen(PORT, () => console.log(`huddle. listening on http://localhost:${PORT}`));
