# Seven Deadly Duel — Character System Update

This build adds a persistent 10-character selection system while keeping the existing duel, controls, weapons, rounds, timer, multiplayer, arena, Supabase authentication, progression, store, profile, and friends systems intact.

## New behavior
- New accounts are sent to **Choose Your Fighter** after setting a gamertag.
- The selected fighter is saved in the existing Supabase `settings` JSON (`character_id`), so no new SQL column is required.
- The character can be changed later from **Characters** in the lobby or **Change Character** in Player Profile.
- Bot matches use the selected player character and a different random roster character.
- Multiplayer start messages carry both players' character IDs so each side renders the correct fighter.
- The existing fighter physics, hit detection, combat states, weapons, rounds, timer, and networking remain the source of gameplay truth.

## Asset note
The included character art is the first integrated anime-art pass. It is used as full-body fighter artwork with state-driven movement transforms. It is intentionally isolated from the combat logic so higher-quality true side-view animation frame sets can be dropped into the same character system later without redesigning account selection or combat.

## Supabase
The existing `duelforge_set_profile` RPC already accepts `p_settings jsonb`, so this build stores `character_id` inside that JSON. If the existing DuelForge SQL is already installed, no new database migration is required for character selection.
