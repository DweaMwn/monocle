(() => {
'use strict';

/* ------------------------------------------------------------------ data */
const TOPICS = [
  { id: 'football', label: 'Football', icon: 'flame', bg: '#e5f2ea', fg: '#2f8a5b' },
  { id: 'music', label: 'Music', icon: 'music', bg: '#f1e2f8', fg: '#9a55bd' },
  { id: 'anime', label: 'Anime', icon: 'sparkle', bg: '#fdebd5', fg: '#c8793a' },
  { id: 'politics', label: 'Politics', icon: 'globe', bg: '#e2e9fb', fg: '#4a6fc2' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad', bg: '#ebe5fa', fg: '#7e5bc7' },
  { id: 'everything', label: 'Everything else', icon: 'chat', bg: '#fbe3ea', fg: '#b24b67' },
];
const topicOf = (id) => TOPICS.find((t) => t.id === id) || TOPICS[5];

const P = {
  flame: '<path d="M12 3c.8 3.4 5 5.4 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.3 1.3 1 2.1 2 2.2 0-3-.4-5 1-8z"/>',
  music: '<circle cx="9" cy="17" r="3"/><path d="M12 17V4l6 3"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  gamepad: '<rect x="3" y="7" width="18" height="11" rx="5.5"/><path d="M8 10v4M6 12h4"/><path d="M15.5 11h.01M17.5 13h.01"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="2"/><rect x="17" y="14" width="4" height="6" rx="2"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  signal: '<circle cx="12" cy="12" r="1.5"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"/>',
  wave: '<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>',
  pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
};
const ic = (name, cls = '') =>
  `<svg class="ic ${cls || (name === 'play' || name === 'pause' ? 'fill' : '')}" viewBox="0 0 24 24" aria-hidden="true">${P[name]}</svg>`;

const EMOJIS = ('😀 😂 🤣 😊 😍 🥰 😎 🤩 🤔 😅 😭 😮 😱 🥳 🙌 👏 👍 👎 🙏 💪 🔥 ❤️ 💜 💔 ✨ 🎉 💯 ⚡ ' +
  '⚽ 🥅 🏆 🏟️ 🎶 🎧 🎤 🎸 🎮 🕹️ 👾 🗳️ 🌍 📺 🍿 🎬 👀 😴 🤯 🫡 🤝 😤 😬 🙄 🤡 💀 🫶 ☕').split(' ');

/* ----------------------------------------------------------------- state */
const state = {
  name: safeGet('huddle.name') || '',
  me: null,
  offset: 0, // server time - local time
  rooms: [],
  topic: null,
  query: '',
  sort: 'popular',
  room: null, // joined room {id,title,topic,expiresAt,members,messages}
  role: 'listener',
  closed: false,
  pendingJoin: null,
};
const $ = (s, r = document) => r.querySelector(s);
const now = () => Date.now() + state.offset;

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const av = (initials, ci, extra = '') => `<span class="av c${ci} ${extra}">${esc(initials)}</span>`;

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------ connection */
let ws = null;
let retry = 0;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => {
    retry = 0;
    $('#banner').hidden = true;
    if (state.room && !state.closed) wsSend({ type: 'join', roomId: state.room.id, role: state.role, name: state.name });
  };
  ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  ws.onclose = () => {
    $('#banner').hidden = false;
    setTimeout(connect, Math.min(5000, 400 * 2 ** retry++));
  };
}
function wsSend(obj) {
  if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
  toast('Not connected yet — hold on a second.');
  return false;
}
const syncClock = (serverNow) => { if (serverNow) state.offset = serverNow - Date.now(); };

function onMessage(m) {
  switch (m.type) {
    case 'welcome':
      state.me = m.id; syncClock(m.serverNow); state.rooms = m.rooms;
      renderHome(); route();
      break;
    case 'rooms':
      syncClock(m.serverNow); state.rooms = m.rooms;
      renderHome();
      if (state.pendingJoin) showGate(state.pendingJoin);
      break;
    case 'joined':
      syncClock(m.serverNow); state.me = m.me;
      state.room = m.room; state.closed = false;
      state.role = (m.room.members.find((x) => x.id === m.me) || {}).role || 'listener';
      enterRoom();
      break;
    case 'members':
      if (!state.room) break;
      state.room.members = m.members;
      { const mine = m.members.find((x) => x.id === state.me);
        if (mine && mine.role !== state.role) { state.role = mine.role; renderComposer(); } }
      renderPeople();
      break;
    case 'message':
      if (!state.room) break;
      syncClock(m.serverNow);
      state.room.messages.push(m.msg);
      state.room.expiresAt = m.expiresAt;
      appendMessage(m.msg, true);
      bumpTimer();
      break;
    case 'room_closed':
      if (state.room && state.room.id === m.roomId) showClosed();
      else if (state.pendingJoin === m.roomId) showGate(m.roomId);
      break;
    case 'join_failed':
      if (state.room && state.room.id === m.roomId) showClosed();
      else { toast('That room has already closed.'); if (location.hash) history.replaceState(null, '', '#/'); state.pendingJoin = null; showHome(); }
      break;
    case 'error':
      toast(m.message);
      break;
  }
}

/* ------------------------------------------------------------------ home */
function renderTopics() {
  $('#topics').innerHTML = TOPICS.map((t) => `
    <button class="topic" data-topic="${t.id}" aria-pressed="${state.topic === t.id}">
      <span class="topic-ic" style="background:${t.bg};color:${t.fg}">${ic(t.icon)}</span>${t.label}
    </button>`).join('');
}

function visibleRooms() {
  const q = state.query.trim().toLowerCase();
  let list = state.rooms.filter((r) => (!state.topic || r.topic === state.topic) && (!q || r.title.toLowerCase().includes(q)));
  const by = {
    popular: (a, b) => b.count - a.count || b.createdAt - a.createdAt,
    new: (a, b) => b.createdAt - a.createdAt,
    ending: (a, b) => a.expiresAt - b.expiresAt,
  }[state.sort];
  return list.sort(by);
}

function cardHTML(r) {
  const t = topicOf(r.topic);
  const left = r.expiresAt - now();
  return `
  <article class="card" data-id="${r.id}">
    <div class="card-top">
      <span class="chip" style="background:${t.bg}">${t.label}</span>
      <span class="live ${left < 30000 ? 'low' : ''}"><i class="live-dot"></i>Live <time data-exp="${r.expiresAt}">${fmt(left)}</time></span>
    </div>
    <h4>${esc(r.title)}</h4>
    <div class="card-meta">
      <div class="avs">${r.avatars.map((a) => av(a.initials, a.ci)).join('')}</div>
      <b>${r.count} ${r.count === 1 ? 'person' : 'people'}</b><span>${r.speakers} speaking</span>
    </div>
    <div class="card-actions">
      <button class="btn ghost" data-act="listen">${ic('headphones')}Listen in</button>
      <button class="btn soft" data-act="speak">${ic('mic')}Join as speaker</button>
    </div>
  </article>`;
}

function renderHome() {
  renderTopics();
  const list = visibleRooms();
  const t = state.topic ? topicOf(state.topic) : null;
  $('#listTitle').textContent = t ? `${t.label} rooms` : 'Live rooms';
  $('#listCount').textContent = list.length;
  $('#rooms').innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<div class="empty"><h4>${state.query ? 'No rooms match that' : t ? `Nobody’s talking ${esc(t.label)} yet` : 'It’s quiet right now'}</h4>
       <p>${state.query ? 'Try a different search.' : 'Start a room and the conversation can begin.'}</p>
       <button class="btn primary" data-act="start">${ic('plus')}Create a room</button></div>`;
}

function tick() {
  const n = now();
  document.querySelectorAll('time[data-exp]').forEach((el) => {
    const left = +el.dataset.exp - n;
    el.textContent = fmt(left);
    el.parentElement.classList.toggle('low', left < 30000);
  });
  if (state.room && !state.closed) {
    const left = state.room.expiresAt - n;
    const timer = $('#rvTimer');
    if (!timer) return;
    $('#rvTime').textContent = fmt(left);
    timer.classList.toggle('low', left < 30000);
    $('#rvBar').parentElement.classList.toggle('low', left < 30000);
    $('#rvBar').style.width = Math.min(100, (Math.max(0, left) / 180000) * 100) + '%';
    $('#rvHint').textContent = left < 30000 && left > 0
      ? (state.role === 'speaker' ? 'Going quiet — say something to keep this room alive.' : 'Going quiet — this room is about to close.')
      : '';
  }
}

/* ----------------------------------------------------------------- sheets */
function openSheet(html) {
  const root = $('#sheetRoot');
  root.innerHTML = `<div class="scrim" data-scrim><div class="sheet" role="dialog" aria-modal="true">
    <button class="icon-btn sheet-x" data-close aria-label="Close">${ic('x')}</button>${html}</div></div>`;
  const first = root.querySelector('input,select');
  if (first) setTimeout(() => first.focus(), 60);
  return root;
}
function closeSheet() { $('#sheetRoot').innerHTML = ''; }

function ensureName() {
  if (state.name) return Promise.resolve(state.name);
  return new Promise((resolve) => {
    const root = openSheet(`
      <div class="sheet-badge">${ic('smile')}</div>
      <h2>What should we call you?</h2>
      <p class="lead">Pick a name others will see in the room.</p>
      <form id="nameForm">
        <div class="field"><label for="nm">Display name</label><input id="nm" maxlength="20" placeholder="e.g. Ama" autocomplete="nickname" required></div>
        <button class="btn primary block" type="submit">Continue</button>
      </form>`);
    $('#nameForm', root).onsubmit = (e) => {
      e.preventDefault();
      const v = $('#nm', root).value.replace(/\s+/g, ' ').trim();
      if (!v) return;
      state.name = v.slice(0, 20); safeSet('huddle.name', state.name);
      closeSheet(); resolve(state.name);
    };
  });
}

function openCreate(presetTopic) {
  ensureName().then(() => {
    const root = openSheet(`
      <div class="sheet-badge">${ic('wave')}</div>
      <h2>Start a conversation.</h2>
      <p class="lead">Pick your topic. Find your people. You have 3 minutes to get things going.</p>
      <form id="createForm">
        <div class="field"><label for="rt">What’s the conversation?</label>
          <input id="rt" maxlength="80" placeholder="Give your room a title…" autocomplete="off"></div>
        <div class="field"><label for="rp">Topic <small>(required)</small></label>
          <select id="rp"><option value="">Choose a topic</option>${TOPICS.map((t) => `<option value="${t.id}" ${t.id === presetTopic ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
        <div class="note">${ic('timer')}<span>Every message adds 30 seconds. After 3 minutes of silence, the room closes and its messages disappear.</span></div>
        <button id="rgo" class="btn primary block" type="submit" disabled>${ic('plus')}Create room</button>
      </form>`);
    const title = $('#rt', root), topic = $('#rp', root), go = $('#rgo', root);
    const check = () => { go.disabled = title.value.trim().length < 3 || !topic.value; };
    title.oninput = topic.onchange = check; check();
    $('#createForm', root).onsubmit = (e) => {
      e.preventDefault(); check();
      if (go.disabled) return;
      if (wsSend({ type: 'create', title: title.value, topic: topic.value, name: state.name })) closeSheet();
    };
  });
}

/* ----------------------------------------------------------------- routing */
function showHome() {
  $('#roomView').hidden = true; $('#roomView').innerHTML = '';
  $('#home').hidden = false;
  document.title = 'huddle. — live rooms';
}

function route() {
  const m = location.hash.match(/^#\/room\/([a-f0-9]+)/);
  if (!m) {
    state.pendingJoin = null;
    if (state.room) leaveLocal();
    showHome();
    return;
  }
  if (state.room && state.room.id === m[1]) return;
  state.pendingJoin = m[1];
  showGate(m[1]);
}
window.addEventListener('hashchange', route);

function leaveLocal() {
  if (!state.closed) wsSend({ type: 'leave' });
  stopRecording(true);
  state.room = null; state.closed = false;
}

function showGate(id) {
  const r = state.rooms.find((x) => x.id === id);
  const view = $('#roomView');
  $('#home').hidden = true; view.hidden = false;
  if (!r) {
    view.innerHTML = `<div class="rv"><div class="closed">
      <div class="sheet-badge">${ic('timer')}</div><h2>This room has gone quiet.</h2>
      <p>Rooms disappear when nobody talks for 3 minutes. Start a new one, or see what’s live.</p>
      <button class="btn primary" id="gateHome">See live rooms</button></div></div>`;
    $('#gateHome').onclick = () => { history.replaceState(null, '', '#/'); route(); };
    return;
  }
  const t = topicOf(r.topic);
  view.innerHTML = `<div class="rv"><div class="closed">
    <span class="chip" style="background:${t.bg}">${t.label}</span>
    <h2>${esc(r.title)}</h2><p>${r.count} ${r.count === 1 ? 'person' : 'people'} in here · <b data-x>${fmt(r.expiresAt - now())}</b> left</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
      <button class="btn ghost" data-g="listener">${ic('headphones')}Listen in</button>
      <button class="btn primary" data-g="speaker">${ic('mic')}Join as speaker</button></div>
    <button class="link" id="gateHome">Back to rooms</button></div></div>`;
  $('#gateHome').onclick = () => { history.replaceState(null, '', '#/'); route(); };
  view.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () =>
    ensureName().then(() => wsSend({ type: 'join', roomId: id, role: b.dataset.g, name: state.name }))));
}

/* -------------------------------------------------------------------- room */
function enterRoom() {
  closeSheet();
  state.pendingJoin = null;
  const target = '#/room/' + state.room.id;
  if (location.hash !== target) history.pushState(null, '', target);
  $('#home').hidden = true;
  const view = $('#roomView'); view.hidden = false;
  const r = state.room, t = topicOf(r.topic);
  document.title = r.title + ' — huddle.';
  view.innerHTML = `
  <div class="rv">
    <header class="rv-top">
      <button class="icon-btn" id="rvBack" aria-label="Leave room">${ic('back')}</button>
      <div class="rv-title"><span class="chip" style="background:${t.bg}">${t.label}</span><h2>${esc(r.title)}</h2></div>
      <div class="timer" id="rvTimer" aria-label="Time left"><i class="dot"></i><span id="rvTime">3:00</span><span class="bump" id="rvBump">+30s</span></div>
    </header>
    <div class="bar"><i id="rvBar"></i></div>
    <div class="people" id="rvPeople"></div>
    <div class="chat" id="rvChat" role="log" aria-live="polite"></div>
    <div class="hint" id="rvHint"></div>
    <footer class="composer" id="rvComposer"></footer>
  </div>`;
  $('#rvBack').onclick = () => { history.replaceState(null, '', '#/'); route(); };
  renderPeople(); renderComposer();
  const chat = $('#rvChat');
  if (!r.messages.length) chat.innerHTML = emptyChat();
  else r.messages.forEach((m) => appendMessage(m, false));
  chat.scrollTop = chat.scrollHeight;
  tick();
}

const emptyChat = () => `<div class="chat-empty"><b>You’re in.</b>Say hello — every message adds 30 seconds to the clock.</div>`;

function renderPeople() {
  const box = $('#rvPeople'); if (!box || !state.room) return;
  const ms = state.room.members;
  const sp = ms.filter((m) => m.role === 'speaker'), li = ms.filter((m) => m.role !== 'speaker');
  box.innerHTML = sp.map((m) => `<div class="spk" title="${esc(m.name)}">${av(m.initials, m.ci)}${m.id === state.me ? '<span class="you">you</span>' : ''}</div>`).join('') +
    `<div class="listening">${ic('headphones')}${li.length} listening</div>`;
}

function renderComposer() {
  const box = $('#rvComposer'); if (!box) return;
  if (state.role !== 'speaker') {
    box.innerHTML = `<div class="listen-bar"><span>You’re listening. Join in to send messages.</span>
      <button class="btn primary" id="becomeSpeaker">${ic('mic')}Speak</button></div>`;
    $('#becomeSpeaker').onclick = () => wsSend({ type: 'role', role: 'speaker' });
    return;
  }
  box.innerHTML = `
    <div class="emoji-pop" id="emojiPop" hidden>${EMOJIS.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>
    <form class="cbox" id="msgForm" autocomplete="off">
      <button type="button" class="icon-btn" id="emojiBtn" aria-label="Emojis">${ic('smile')}</button>
      <input id="msgInput" maxlength="500" placeholder="Say something…" enterkeyhint="send" aria-label="Message">
      <button type="button" class="icon-btn mic" id="micBtn" aria-label="Record a voice note">${ic('mic')}</button>
      <button type="submit" class="send" id="sendBtn" aria-label="Send" hidden>${ic('send')}</button>
    </form>`;
  const input = $('#msgInput'), pop = $('#emojiPop');
  const sync = () => { const has = input.value.trim().length > 0; $('#sendBtn').hidden = !has; $('#micBtn').hidden = has; };
  input.oninput = sync;
  $('#emojiBtn').onclick = () => { pop.hidden = !pop.hidden; };
  pop.onclick = (e) => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    const s = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + b.dataset.e + input.value.slice(en);
    input.focus(); const p = s + b.dataset.e.length; input.setSelectionRange(p, p); sync();
  };
  input.onfocus = () => { pop.hidden = true; };
  $('#msgForm').onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    if (wsSend({ type: 'chat', text })) { input.value = ''; sync(); pop.hidden = true; }
  };
  $('#micBtn').onclick = startRecording;
}

function bumpTimer() {
  const b = $('#rvBump'); if (!b) return;
  b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|️|‍|\s){1,8}$/u;

function appendMessage(m, animate) {
  const chat = $('#rvChat'); if (!chat) return;
  const empty = chat.querySelector('.chat-empty'); if (empty) empty.remove();
  const mine = m.from === state.me;
  const near = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 140;
  const time = new Date(m.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const el = document.createElement('div');
  el.className = 'msg' + (mine ? ' me' : '');
  let body;
  if (m.kind === 'voice') body = voiceHTML(m);
  else body = `<div class="bubble ${EMOJI_ONLY.test(m.text) ? 'big' : ''}">${esc(m.text)}</div>`;
  el.innerHTML = `${av(m.initials, m.ci)}<div><div class="who">${mine ? 'You' : esc(m.name)} · ${time}</div>${body}</div>`;
  if (!animate) el.style.animation = 'none';
  chat.appendChild(el);
  if (m.kind === 'voice') wireVoice(el, m);
  if (mine || near) chat.scrollTop = chat.scrollHeight;
}

/* ------------------------------------------------------------- voice notes */
const BARS = 30;
function barHeights(id) {
  let h = 0; for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: BARS }, () => { h = (h * 1664525 + 1013904223) >>> 0; return 22 + (h % 78); });
}
function voiceHTML(m) {
  return `<div class="bubble"><div class="vn">
    <button class="vn-play" aria-label="Play voice note">${ic('play')}</button>
    <div class="vn-wave">${barHeights(m.id).map((h) => `<i style="height:${h}%"></i>`).join('')}</div>
    <span class="vn-t">${fmt(m.dur * 1000)}</span></div></div>`;
}

let currentAudio = null, currentReset = null;
function wireVoice(el, m) {
  const btn = $('.vn-play', el), bars = [...el.querySelectorAll('.vn-wave i')], label = $('.vn-t', el);
  let audio = null;
  const reset = () => { btn.innerHTML = ic('play'); bars.forEach((b) => b.classList.remove('on')); label.textContent = fmt(m.dur * 1000); };
  btn.onclick = () => {
    if (audio && !audio.paused) { audio.pause(); btn.innerHTML = ic('play'); return; }
    if (currentAudio && currentAudio !== audio) { currentAudio.pause(); currentReset && currentReset(); }
    if (!audio) {
      const bin = atob(m.data), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      audio = new Audio(URL.createObjectURL(new Blob([u8], { type: m.mime })));
      audio.ontimeupdate = () => {
        const p = Math.min(1, audio.currentTime / m.dur);
        bars.forEach((b, i) => b.classList.toggle('on', i / BARS < p));
        label.textContent = fmt((m.dur - audio.currentTime) * 1000);
      };
      audio.onended = () => { reset(); currentAudio = null; };
    }
    currentAudio = audio; currentReset = reset;
    audio.play().then(() => (btn.innerHTML = ic('pause'))).catch(() => toast('Couldn’t play that voice note.'));
  };
}

let rec = null;
async function startRecording() {
  if (rec) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Voice notes aren’t supported in this browser.');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return toast('Allow microphone access to send voice notes.'); }
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
  const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
  rec = { mr, stream, chunks: [], t0: Date.now(), cancelled: false, timer: null };
  mr.ondataavailable = (e) => e.data.size && rec.chunks.push(e.data);
  mr.onstop = onRecordingStopped;
  mr.start();
  const box = $('#rvComposer');
  box.innerHTML = `<div class="rec"><button class="icon-btn" id="recCancel" aria-label="Cancel recording">${ic('trash')}</button>
    <i class="rec-dot"></i><b id="recT">0:00</b><span class="max">/ 1:00</span>
    <button class="send btn primary" id="recSend" style="width:42px;height:42px;padding:0;border-radius:50%" aria-label="Send voice note">${ic('send')}</button></div>`;
  $('#recCancel').onclick = () => stopRecording(true);
  $('#recSend').onclick = () => stopRecording(false);
  rec.timer = setInterval(() => {
    const s = (Date.now() - rec.t0) / 1000;
    const el = $('#recT'); if (el) el.textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    if (s >= 60) stopRecording(false);
  }, 200);
}
function stopRecording(cancel) {
  if (!rec) return;
  const r = rec; r.cancelled = cancel; clearInterval(r.timer);
  if (r.mr.state !== 'inactive') r.mr.stop(); else onRecordingStopped();
}
function onRecordingStopped() {
  const r = rec; if (!r) return;
  rec = null;
  r.stream.getTracks().forEach((t) => t.stop());
  if (state.room && !state.closed) renderComposer();
  const dur = (Date.now() - r.t0) / 1000;
  if (r.cancelled || !state.room) return;
  if (dur < 1) return toast('Hold on a bit longer — voice notes need at least a second.');
  const blob = new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' });
  const fr = new FileReader();
  fr.onload = () => {
    const data = String(fr.result).split(',')[1] || '';
    wsSend({ type: 'voice', data, mime: blob.type || 'audio/webm', dur: Math.min(dur, 60) });
  };
  fr.readAsDataURL(blob);
}

/* -------------------------------------------------------------- closed room */
function showClosed() {
  state.closed = true;
  stopRecording(true);
  const rv = $('.rv'); if (!rv) return;
  if (rv.querySelector('.closed')) return;
  const d = document.createElement('div');
  d.className = 'closed';
  d.innerHTML = `<div class="sheet-badge">${ic('timer')}</div><h2>This room has gone quiet.</h2>
    <p>Nobody spoke for 3 minutes, so the room closed and its messages are gone.</p>
    <button class="btn primary" id="closedHome">Back to rooms</button>`;
  rv.appendChild(d);
  $('#closedHome').onclick = () => { history.replaceState(null, '', '#/'); route(); };
}

/* --------------------------------------------------------------- UI wiring */
document.addEventListener('click', (e) => {
  const t = e.target;
  const topic = t.closest('[data-topic]');
  if (topic) { state.topic = state.topic === topic.dataset.topic ? null : topic.dataset.topic; renderHome(); return; }
  const act = t.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'start') return openCreate(state.topic);
    const id = act.closest('.card')?.dataset.id; if (!id) return;
    const role = act.dataset.act === 'speak' ? 'speaker' : 'listener';
    ensureName().then(() => wsSend({ type: 'join', roomId: id, role, name: state.name }));
    return;
  }
  if (t.closest('[data-close]') || t.matches('[data-scrim]')) closeSheet();
  const pop = $('#emojiPop');
  if (pop && !pop.hidden && !t.closest('#emojiPop') && !t.closest('#emojiBtn')) pop.hidden = true;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSheet(); const p = $('#emojiPop'); if (p) p.hidden = true; } });

$('#createBtn').onclick = () => openCreate(null);
$('#allTopics').onclick = () => { state.topic = null; renderHome(); };
$('#q').oninput = (e) => { state.query = e.target.value; renderHome(); };
$('#sort').onchange = (e) => { state.sort = e.target.value; renderHome(); };
$('#logoMark').innerHTML = ic('wave');
$('#plusIcon').innerHTML = ic('plus');
$('#signalIcon').innerHTML = ic('signal');
$('#chevIcon').innerHTML = ic('chev');
$('#searchIcon').innerHTML = ic('search');

renderHome();
setInterval(tick, 250);
connect();
})();
