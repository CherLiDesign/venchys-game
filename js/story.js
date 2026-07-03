/* ============================================================================
 * story.js — Story / intro screen
 * ----------------------------------------------------------------------------
 * Screens register themselves on window.Screens and are shown by the router in
 * main.js via Game.go("story"). Story text is data so it's easy to re-word.
 * ==========================================================================*/

(function () {
  "use strict";

  const STORY_BEATS = [
    { emoji: "🪐", text: "Long ago, on a faraway alien planet, all the little creatures lived happily together." },
    { emoji: "🧪", text: "One day, they accidentally drank a mysterious magical potion..." },
    { emoji: "😡", text: "Some creatures turned into angry monsters! Now every creature has two forms." },
    { emoji: "🤔", text: "Which side will you fight for?" },
  ];

  function render() {
    const { el, mount } = window.UI;

    const beats = STORY_BEATS.map((b) =>
      el("p", { class: "lead" }, [
        el("span", { class: "story-emoji", style: { display: "inline-block", fontSize: "2rem", marginRight: "8px" }, text: b.emoji }),
        b.text,
      ])
    );

    const screen = el("div", { class: "story" }, [
      el("div", { class: "panel" }, [
        el("div", { class: "story-emoji", text: "✨🪐✨" }),
        el("h2", { class: "title", style: { fontSize: "2.4rem", margin: "6px 0 18px" }, text: "The Story" }),
        ...beats,
        el("div", { class: "btn-row", style: { marginTop: "24px" } }, [
          el("button", {
            class: "btn btn-green btn-lg",
            text: "Continue ➜",
            onClick: () => {
              window.GameAudio.playClick();
              window.Game.go("teamSelect");
            },
          }),
        ]),
      ]),
    ]);

    mount(screen);
  }

  window.Screens = window.Screens || {};
  window.Screens.story = { render };
})();
