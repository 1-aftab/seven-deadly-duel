# DuelForge

Mobile-friendly 2D **dark medieval arena** 1v1 duelling game (ashen skies, torchlit stands, banners, a ringed black moon, a distant golden tree). Vanilla HTML/CSS/JS — no build step, no npm, no backend of our own.

## Run
Open `index.html` (or deploy the folder as-is to GitHub Pages). Multiplayer needs an internet connection; bots work offline.

## Flow
Splash ("developed by just two people, more updates coming soon") → gamertag screen (first launch; change it any time from the lobby pill or Settings) → lobby:
- **Play with bots** – practice best-of-7. **Unranked**: bot wins never touch the leaderboard.
- **Multiplayer** – **ranked**. *Create room* shows a 4-digit code in the room lobby; the friend taps *Join room*, types the code, and the match starts automatically.
- **Leaderboard** – ranked by **multiplayer duel wins only** (then fewer losses). You stay *UNRANKED* until you finish a multiplayer duel. Saved on this device; the six champions are placeholders — a real shared board needs a server and is not faked. Old saves: previous 'wins' are kept as practice wins.
- **Settings** – sound, graphics (Auto / Low), gamertag.

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move | A / D (or arrows) | ◀ ▶ |
| Jump | W / Space / ↑ | JUMP |
| Attack | J | ATTACK |
| Power attack | K (or U) | POWER |
| Dash | L / Shift | DASH |

## Weapons — chosen every round
Before every round (bots **and** multiplayer) both fighters get a **CHOOSE YOUR ARMS** screen (12 s): tap a weapon (or press 1–7), then **LOCK IN**. Picks are hidden until both are locked, then revealed together; if the timer runs out your highlighted weapon (or a random one) is locked automatically. Duplicates are allowed. Weapons: sword, dagger, hammer, spear, axe, katana, greatblade (stats in `src/weapons.js`).
Multiplayer: host runs the phase (`pstart` → `pick`/`lock` → `round` messages in `src/game.js`); the bot picks randomly after a short think.

## Combat
- **Attack**: your weapon's normal swing. After every swing there is a cooldown (swing time + 0.28 s), so you can't spam or chain it. Shown as a bar (keyboard) / dimmed button (touch).
- **Power attack**: ~0.5 s telegraphed charge (glowing aura — the opponent can dodge or interrupt you), then a heavy swing: ~1.6× damage (cap 36), 1.7× hitbox, 1.5× knockback. **7 s cooldown**, and it starts on cooldown for the first ~2 s of each round. Being hit while charging cancels it (and the cooldown is still spent).
- Tuning lives in `src/fighter.js` (`HVCD`, `ATK_GAP`, `atkTimes()`).

## Multiplayer (4-digit codes)
`src/net.js`: the room code is the host's id on the free public PeerJS broker (`wss://0.peerjs.com`), used **only** to swap the WebRTC handshake. Gameplay then runs peer-to-peer over a WebRTC data channel (host-authoritative, guest sends inputs and renders 30 Hz snapshots).
Limits to know about: the public broker and Google STUN servers are free third-party services with no uptime guarantee, and some mobile-carrier/strict NATs can't connect peer-to-peer without a TURN server. Both can be replaced via the `SIGNAL` and `ICE` constants at the top of `net.js` (e.g. your own PeerJS server + a TURN service).

## Low-end device optimizations
- Canvas resolution capped (960 px wide on weak devices, 1280 otherwise) and auto-lowered if the frame rate drops; **Settings → Graphics → Low** forces ~56 % resolution, a 30 fps cap, fewer particles (60), no fog/vignette/motes.
- Weak devices (≤4 cores / ≤2 GB RAM) start one quality step lower automatically.
- Render loop fully stops outside a match (no idle rAF work). Static background layers pre-rendered once.
- UI uses system fonts, inline SVG icons (no images), no `backdrop-filter`/blur; `body.lowfx` strips shadows and decorative animation; reduced-motion respected.
- Network messages are small JSON at 30 Hz; HUD DOM writes are cached and only happen on change.

## Files
`index.html` · `logo.svg` · `src/style.css` · `src/weapons.js` (weapon data + art) · `src/fighter.js` (rig, animation, combat, cooldowns) · `src/arena.js` · `src/fx.js` · `src/bot.js` · `src/net.js` (rooms) · `src/game.js` (flow, input, render loop, UI, online glue)
