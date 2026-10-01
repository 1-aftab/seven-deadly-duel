# DuelForge

A small browser 1v1 fighting-game MVP.

## Run
Open `index.html` in a browser, or use VS Code Live Server.

## GitHub Pages
Push the repository to GitHub, then enable GitHub Pages from:
Settings -> Pages -> Deploy from branch -> main -> /root.

## Current MVP
- Best-of-7 duel; first to 4 rounds wins
- Weapon changes every round
- Bot mode
- Username challenge flow (local preview)
- Wins + coins
- Local leaderboard UI
- Responsive mobile controls
- Procedural CSS arena/fighters, so no external art assets are required

## Important
GitHub Pages is static hosting. For real online usernames, duel requests, coins, wins, and a global leaderboard, connect the UI to a backend/database such as Supabase or Firebase. Do not put secret API keys in frontend code.
