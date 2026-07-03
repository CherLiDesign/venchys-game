# Sounds

All sounds are currently **synthesized** in `js/audio.js` with the Web Audio API,
so no audio files are required to play the game.

## Replacing with real sounds

Keep the public methods the game calls (`playClick`, `playAttack`, `playHit`,
`playSpecial`, `playHeal`, `playVictory`, `playDefeat`, `startMusic`/`stopMusic`)
and swap their bodies to load & play files from this folder, e.g.:

```js
playClick() {
  if (!this.sfxOn) return;
  new Audio("assets/sounds/click.mp3").play();
}
```

Suggested files to add later: `click.mp3`, `attack.mp3`, `hit.mp3`,
`special.mp3`, `heal.mp3`, `victory.mp3`, `defeat.mp3`, `music.mp3`.
