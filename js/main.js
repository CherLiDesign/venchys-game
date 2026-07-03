/* ============================================================================
 * main.js — Router, Home & Result screens, global controls, boot
 * ----------------------------------------------------------------------------
 * The router (Game.go) is a tiny state machine over window.Screens. Every
 * screen module registers a { render(data) } object; main wires navigation,
 * shared game state, the starfield, audio buttons, and app boot.
 * ==========================================================================*/

(function () {
  "use strict";

  /* ---- Router + shared state ---------------------------------------------- */
  const Game = {
    state: {
      side: null, // "happy" | "angry"
      playerTeam: [], // array of character records
      enemyTeam: [],
    },
    current: null,
    go(screenName, data) {
      const screen = window.Screens[screenName];
      if (!screen) {
        console.error("Unknown screen:", screenName);
        return;
      }
      this.current = screenName;
      screen.render(data);
    },
    reset() {
      this.state.side = null;
      this.state.playerTeam = [];
      this.state.enemyTeam = [];
    },
  };
  window.Game = Game;

  /* ---- Home screen --------------------------------------------------------- */
  function renderHome() {
    const { el, mount } = window.UI;

    // A ring of orbiting creatures around the planet.
    const happy = window.GameData.byForm("happy");
    const angry = window.GameData.byForm("angry");
    const ringA = el("div", { class: "orbit" }, [
      orbitCreature(happy[0], 0), orbitCreature(angry[3], 90),
      orbitCreature(happy[5], 180), orbitCreature(angry[6], 270),
    ]);
    const ringB = el("div", { class: "orbit reverse" }, [
      orbitCreature(happy[2], 45), orbitCreature(angry[1], 135),
      orbitCreature(happy[7], 225), orbitCreature(angry[4], 315),
    ]);

    const planetStage = el("div", { class: "planet-stage" }, [
      el("div", { class: "planet-ring" }),
      el("div", { class: "planet" }),
      ringA,
      ringB,
    ]);

    const screen = el("div", { class: "home" }, [
      el("div", { class: "logo-badge", text: "🪐" }),
      el("h1", { class: "title title-xl game-title", text: "Venchy's Game" }),
      el("div", { class: "tagline", text: "Battle for the Alien Planet!" }),
      planetStage,
      el("button", {
        class: "btn btn-green btn-lg",
        text: "▶ Play",
        onClick: () => { window.GameAudio.playClick(); Game.reset(); Game.go("story"); },
      }),
    ]);

    mount(screen);
  }

  function orbitCreature(character, angleDeg) {
    // Place each creature on the orbit ring and counter-rotate so it stays upright.
    const inner = character
      ? window.UI.el("div", { class: "creature" }, [window.UI.portraitContent(character)])
      : window.UI.el("div", { class: "creature", text: "⭐️" });
    const wrap = window.UI.el("div", {
      style: {
        position: "absolute",
        inset: "0",
        transform: `rotate(${angleDeg}deg)`,
      },
    }, [inner]);
    return wrap;
  }

  /* ---- Result screen ------------------------------------------------------- */
  function renderResult(data) {
    const { el, mount } = window.UI;
    const won = !!(data && data.playerWon);

    if (won) {
      window.GameAudio.playVictory();
      window.UI.confetti(90);
    } else {
      window.GameAudio.playDefeat();
    }

    const screen = el("div", { class: "result " + (won ? "win" : "lose") }, [
      el("div", { class: "result-emoji", text: won ? "🎉" : "😵" }),
      el("h1", { class: "title title-xl", text: won ? "You Saved the Planet!" : "The Angry Monsters Won!" }),
      el("p", { class: "lead", style: { color: "#fff", fontWeight: "600" },
        text: won ? "Your heroes were amazing! 🌟" : "Don't give up — try again, hero!" }),
      el("div", { class: "btn-row", style: { marginTop: "10px" } }, [
        el("button", {
          class: "btn btn-green btn-lg",
          text: "🔁 Play Again",
          onClick: () => { window.GameAudio.playClick(); replay(); },
        }),
        el("button", {
          class: "btn btn-ghost btn-lg",
          text: "🏠 Back Home",
          onClick: () => { window.GameAudio.playClick(); Game.reset(); Game.go("home"); },
        }),
      ]),
    ]);

    mount(screen);
  }

  /** Replay: keep the same chosen side, re-pick heroes from character select. */
  function replay() {
    if (Game.state.side) {
      Game.go("charSelect");
    } else {
      Game.go("home");
    }
  }

  /* ---- Global audio controls (top-right icon buttons) --------------------- */
  function onMusicToggle() {
    const on = window.GameAudio.toggleMusic();
    syncControlButtons();
    // Refresh home button label if we're on the home screen.
    if (Game.current === "home") renderHome();
    return on;
  }

  function onSfxToggle() {
    window.GameAudio.toggleSfx();
    window.GameAudio.playClick();
    syncControlButtons();
  }

  function syncControlButtons() {
    const m = document.getElementById("music-toggle");
    const s = document.getElementById("sound-toggle");
    if (m) { m.textContent = "🎵"; m.classList.toggle("off", !window.GameAudio.musicOn); }
    if (s) { s.textContent = window.GameAudio.sfxOn ? "🔊" : "🔇"; s.classList.toggle("off", !window.GameAudio.sfxOn); }
  }

  /* ---- Starfield ----------------------------------------------------------- */
  function buildStarfield() {
    const field = document.getElementById("starfield");
    const glyphs = ["✨", "⭐️", "🌟", "💫", "🪐", "☄️", "✦", "·"];
    const count = 38;
    for (let i = 0; i < count; i++) {
      const s = window.UI.el("span", {
        class: "star",
        text: glyphs[i % glyphs.length],
        style: {
          left: Math.random() * 100 + "vw",
          fontSize: 0.8 + Math.random() * 1.6 + "rem",
          animationDuration: 12 + Math.random() * 18 + "s",
          animationDelay: -Math.random() * 20 + "s",
          opacity: 0.4 + Math.random() * 0.5,
        },
      });
      field.appendChild(s);
    }
  }

  /* ---- Boot ---------------------------------------------------------------- */
  function boot() {
    window.Screens.home = { render: renderHome };
    window.Screens.result = { render: renderResult };

    buildStarfield();

    document.getElementById("music-toggle").addEventListener("click", onMusicToggle);
    document.getElementById("sound-toggle").addEventListener("click", onSfxToggle);
    syncControlButtons();

    // Browsers block audio until the first gesture — kick off music once.
    const startAudioOnce = () => {
      if (window.GameAudio.musicOn) window.GameAudio.startMusic();
      window.removeEventListener("pointerdown", startAudioOnce);
    };
    window.addEventListener("pointerdown", startAudioOnce);

    Game.go("home");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
