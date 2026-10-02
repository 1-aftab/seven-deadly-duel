# DuelForge

Mobile-friendly 2D fantasy 1v1 fighting game. Vanilla HTML/CSS/JS — no build step, no npm, no backend, no external assets.

## Run
Open `index.html` in a browser (or deploy the folder as-is to GitHub Pages: Settings → Pages → Deploy from branch → `main` → `/root`).

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move | A / D (or arrows) | ◀ ▶ (hold, slide between them) |
| Jump | W / Space / ↑ | JUMP |
| Attack | J (or K) | ATTACK |
| Dash | L / Shift | DASH (hold a direction for dash direction) |

## What's in it
- **Best of 7**, first to 4 rounds. Every round both fighters get a new weapon (never the same as their last one, never the same as each other).
- **7 weapons** with distinct wind-up / swing / recovery timing, damage, reach, knockback, walk speed, lunge and hit-stop: Sword, Dagger, Hammer, Spear, Axe, Katana, Greatblade.
- **Procedural skeletal animation** (`src/fighter.js`): breathing idle, walk cycle, jump/fall, landing, dash, hurt, KO fall, victory, defeat kneel; cape/plume secondary motion.
- **Real swings**: wind-up pose → fast arc → recovery. The weapon is attached to the animated hand; hits are tested against the weapon's *actual swept segment* during the swing. Trail, sparks, flare/ring, hit-stop, screen shake, knockback, hurt flash.
- **Bot AI** (`src/bot.js`): spacing by weapon reach, punishes recovery, evades wind-ups with dash/jump/retreat, human-like reaction delays.
- **Arena** (`src/arena.js`): moon, stars, castle ridge, parallax mountains, fog, torches (cyan/pink flames + light pools), embers, motes, sigil floor, vignette. Static layers are pre-rendered once.
- **Coins / wins / leaderboard** kept from the MVP and now saved in `localStorage`. Win = +150 coins +1 win, loss = +50, +10 coins per round won. Tap the PLAYER pill to rename.
- Tiny synthesized **SFX** (WebAudio, no files) with a mute toggle.

## Online (WebRTC, no server)
`src/net.js` implements real peer-to-peer play over a WebRTC data channel using copy/paste **room codes** (~600 chars, deflate-compressed):

1. Host: *Play a friend → Create room → Generate room code* and send it to the friend.
2. Guest: *Join room*, paste it, *Generate reply*, send the reply code back.
3. Host pastes the reply → *Connect*. The duel starts automatically.

Host-authoritative model: the host runs the simulation, the guest sends inputs and renders 30 Hz snapshots + hit events (so the guest feels one round-trip of input latency). Free public STUN servers are used; strict/symmetric NATs may need a TURN server, which cannot be free/serverless.

**Automatic matchmaking** needs a signaling rendezvous (a server). The transport is already isolated: `DF.Net.createRoom/joinRoom/acceptAnswer` only exchange two opaque strings, so any relay (even a tiny serverless function) can replace the manual copy/paste without touching gameplay code. Not faked: with no relay, there is no matchmaking.

## Performance notes
`requestAnimationFrame` + clamped delta time, fixed ≤20 ms sim sub-steps, pre-rendered background layers, ≤140 pooled particles, no shadowBlur, no libraries. Backing canvas is capped at 1280 px wide and drops resolution automatically (up to two steps) if frames run slow.

## Files
`index.html` · `src/style.css` · `src/weapons.js` (data + weapon art) · `src/fighter.js` (rig, animation, combat state) · `src/arena.js` · `src/fx.js` (particles/shake/SFX) · `src/bot.js` · `src/net.js` · `src/game.js` (match flow, input, render loop, UI, online glue)
