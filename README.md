# 🪐 Venchy's Game — Battle for the Alien Planet

A cute, kid-friendly browser fighting game. Pick a team of creatures (Happy 😊 or
Angry 😡), then battle 3-on-3 King-of-Fighters style — when one fighter faints,
the next steps up until one whole team is down.

**▶ Play:** https://cherlidesign.github.io/venchys-game/

## Controls
- **Move:** ← → (or A / D)
- **Jump:** ↑ (or W / Space)
- **Punch:** J
- **Special:** K (when the star meter is full)

## The cast
8 creatures, each with a Happy and Angry form and a unique special power:
Brud (Flame Shot), Durple (Purple Blast), Grey (Shadow Claw),
Mr. Funcomp (System Boost), Mr. Sun (Sunshine Heal), Owackx (Earth Slam),
Raddy (Dash), and Venera (Toxic Bloom).

## Tech
Pure HTML / CSS / JavaScript — no build step, no backend. All artwork is
Venchy's original drawings; sounds are synthesized with the Web Audio API.

```
index.html
css/styles.css
js/  characters.js · audio.js · ui.js · story.js · selection.js · battle.js · main.js
assets/  images/ (character sprites) · background/ (stage) · sounds/
```

Built with [Claude Code](https://claude.com/claude-code).
