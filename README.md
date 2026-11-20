# Monocle

Live discussion rooms that disappear when the conversation goes quiet.

- Pick a topic (Football, Music, Anime, Politics, Gaming, Everything else) and see its live rooms.
- Join a room as a **listener** or a **speaker**. Listeners can read; tap *Speak* to join in.
- Anyone can create a room. A topic is required.
- Rooms have **separate seat limits** for speakers (2–10, default 6) and listeners (0–30, default 10),
  chosen by the creator. When a seat is full its join button is disabled; it opens again when someone leaves.
- A new room lives **3 minutes**. Every message (text, emoji or voice note) adds **30 seconds**.
  When the clock hits zero the room closes and everything in it is erased.
- Rooms have a chat box, emoji picker and voice notes (up to 60 s).

## Auto rooms and the guide bot

The server keeps a few themed rooms open at all times (default: 4 rooms from the `gta6` theme in
`autorooms.js`, under Gaming). When one closes, a different title takes its place.

- Each auto room starts with **one message from "Monocle Guide"** (shown with a BOT badge): a question related to the
  room's title. That is all it ever does. It doesn't greet anyone and never posts again.
- The guide is not a person: it takes no seat, is never counted in the people numbers, and its message doesn't
  extend the room's clock, so it can't keep an empty room alive.
- When the first human joins an auto room, its clock resets to a full 3:00.
- Titles and opening questions live in `autorooms.js` (`title` + `opener` per room).

Settings (environment variables, all optional):

| Variable | Default | What it does |
|---|---|---|
| `AUTO_ROOMS` | `on` | Set to `off` to disable auto rooms |
| `AUTO_THEME` | `gta6` | Which theme in `autorooms.js` to use |
| `AUTO_TARGET` | `4` | How many auto rooms to keep open (0–12) |

To add a theme, copy the `gta6` block in `autorooms.js`, give it a new key, and set `AUTO_THEME` to it.

## Run locally

    npm install
    npm start        # http://localhost:3000

Needs Node 18+. The only dependency is `ws`.

## Deploy for free (Render)

The app needs a server that keeps WebSocket connections open, so static hosts and
serverless platforms (Vercel, Netlify, Cloudflare Pages) will not work.

1. Push this folder to a GitHub repo.
2. On render.com: **New → Blueprint** (or **Web Service**) and pick the repo.
   `render.yaml` already sets: runtime Node, plan Free, build `npm install`, start `npm start`.
3. Open the `*.onrender.com` URL. Microphone access works because Render serves HTTPS.

Free web services on Render sleep after ~15 minutes without traffic, so the first
visit after a quiet spell takes up to a minute to wake. Rooms are in memory by design,
so a restart simply clears them. Check Render's current free-tier terms before relying on it.

Other hosts that run a long-lived Node process (Koyeb, Fly.io, Railway, a VPS) also work:
`npm install && npm start`, and the app reads the `PORT` environment variable.

## Tweaking the rules

Top of `server.js`: `INITIAL_MS` (3 min), `BONUS_MS` (30 s), `MAX_VOICE_SECONDS`.
Topics live in `server.js` (`TOPICS`) and `public/app.js` (`TOPICS`).

## Limits to know about

- Single server process, all state in memory (fine for hundreds of users, not for scaling out).
- Voice notes are recorded clips sent over the WebSocket, not live voice chat.
- No accounts: a display name is stored in the browser.
