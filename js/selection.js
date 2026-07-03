/* ============================================================================
 * selection.js — Team Select + Character Select screens
 * ----------------------------------------------------------------------------
 * Team Select picks the side (happy/angry). Character Select shows the 8
 * creatures of that side and lets the player pick exactly 3. The computer then
 * auto-picks 3 from the opposite side.
 * ==========================================================================*/

(function () {
  "use strict";

  const TEAM_SIZE = 3;

  /* ---- Team Select --------------------------------------------------------- */
  function renderTeamSelect() {
    const { el, mount } = window.UI;

    function chooseSide(side) {
      window.GameAudio.playClick();
      window.Game.state.side = side;
      window.Game.go("charSelect");
    }

    const screen = el("div", { class: "team-select" }, [
      el("h2", { class: "title", style: { color: "#fff", fontSize: "2.6rem" }, text: "Choose Your Side!" }),
      el("p", { class: "tagline", style: { color: "#fff", fontSize: "1.2rem", marginTop: "6px" }, text: "Fight for the Happy creatures or the Angry monsters." }),
      el("div", { class: "team-cards" }, [
        el("div", { class: "team-card happy", onClick: () => chooseSide("happy") }, [
          el("span", { class: "big-emoji", text: "😊" }),
          el("h3", { text: "Happy Team" }),
          el("p", { text: "Kind, cheerful creatures who protect the planet." }),
          el("div", { class: "mini-row" }, buildPreviewRow("happy")),
        ]),
        el("div", { class: "team-card angry", onClick: () => chooseSide("angry") }, [
          el("span", { class: "big-emoji", text: "😡" }),
          el("h3", { text: "Angry Team" }),
          el("p", { text: "Grumpy monsters who want the planet for themselves." }),
          el("div", { class: "mini-row" }, buildPreviewRow("angry")),
        ]),
      ]),
      el("div", { class: "btn-row", style: { marginTop: "26px" } }, [
        el("button", {
          class: "btn btn-ghost",
          text: "⬅ Back",
          onClick: () => { window.GameAudio.playClick(); window.Game.go("story"); },
        }),
      ]),
    ]);

    mount(screen);
  }

  function buildPreviewRow(side) {
    // Small thumbnails of a few creatures on that side.
    const { el, portraitContent } = window.UI;
    return window.GameData.byForm(side).slice(0, 4).map((c) =>
      el("span", { class: "mini-thumb" }, [portraitContent(c)])
    );
  }

  /* ---- Character Select ---------------------------------------------------- */
  function renderCharSelect() {
    const { el, mount, creatureCard } = window.UI;
    const side = window.Game.state.side;
    const roster = window.GameData.byForm(side);
    const selected = new Set();

    // Elements we need to update as the player picks.
    let counterEl, startBtn, grid;

    function refresh() {
      const n = selected.size;
      counterEl.innerHTML =
        `Selected: <span class="dots">${"●".repeat(n)}${"○".repeat(TEAM_SIZE - n)}</span> ${n}/${TEAM_SIZE}`;
      startBtn.disabled = n !== TEAM_SIZE;
    }

    function toggle(character, cardNode) {
      window.GameAudio.playClick();
      if (selected.has(character.id)) {
        selected.delete(character.id);
        cardNode.classList.remove("selected");
      } else {
        if (selected.size >= TEAM_SIZE) return; // cap at 3
        selected.add(character.id);
        cardNode.classList.add("selected");
      }
      refresh();
    }

    grid = el("div", { class: "card-grid" });
    roster.forEach((c) => {
      const card = creatureCard(c, {
        selected: false,
        onClick: () => toggle(c, card),
      });
      grid.appendChild(card);
    });

    counterEl = el("div", { class: "pick-counter" });
    startBtn = el("button", {
      class: "btn btn-green",
      text: "Start Battle ⚔️",
      disabled: true,
      onClick: () => {
        window.GameAudio.playClick();
        startBattle(side, [...selected]);
      },
    });

    const screen = el("div", { class: "char-select" }, [
      el("div", { class: "select-header" }, [
        el("button", {
          class: "btn btn-ghost",
          text: "⬅ Back",
          onClick: () => { window.GameAudio.playClick(); window.Game.go("teamSelect"); },
        }),
        el("h2", { class: "title", style: { color: "#fff", fontSize: "2rem", flex: "1" }, text: "Pick Your 3 Heroes!" }),
        counterEl,
      ]),
      grid,
      el("div", { class: "btn-row", style: { marginTop: "16px" } }, [startBtn]),
    ]);

    mount(screen);
    refresh();
  }

  /** Build both teams and jump into battle. */
  function startBattle(side, playerIds) {
    const enemySide = side === "happy" ? "angry" : "happy";

    // Simple computer AI: pick 3 random creatures from the opposite side.
    const enemyPool = window.GameData.byForm(enemySide).slice();
    shuffle(enemyPool);
    const enemyIds = enemyPool.slice(0, TEAM_SIZE).map((c) => c.id);

    window.Game.state.playerTeam = playerIds.map((id) => window.GameData.byId(id));
    window.Game.state.enemyTeam = enemyIds.map((id) => window.GameData.byId(id));
    window.Game.go("battle");
  }

  // Deterministic-free shuffle (Math.random is fine at runtime in the browser).
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  window.Screens = window.Screens || {};
  window.Screens.teamSelect = { render: renderTeamSelect };
  window.Screens.charSelect = { render: renderCharSelect };
})();
