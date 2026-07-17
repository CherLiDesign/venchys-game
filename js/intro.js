/* ============================================================================
 * intro.js — Opening cinematic
 * ----------------------------------------------------------------------------
 * Plays Venchy's hand-painted intro video, then continues to the Home screen.
 * A "Start" gesture is needed so the video can play WITH sound (browsers block
 * autoplay-with-audio). A Skip button jumps straight to Home.
 * ==========================================================================*/

(function () {
  "use strict";

  const VIDEO_SRC = "assets/background/intro.mp4";
  const POSTER = "assets/background/intro_poster.jpg";

  function render() {
    const { el, mount } = window.UI;

    const video = el("video", {
      class: "intro-video",
      src: VIDEO_SRC,
      poster: POSTER,
      playsinline: "",
      "webkit-playsinline": "",
      preload: "auto",
    });

    // Hide the persistent mute icons during the cinematic for a clean full screen.
    const controls = document.getElementById("global-controls");
    if (controls) controls.style.display = "none";

    let started = false;
    const goHome = () => {
      try { video.pause(); } catch (e) {}
      if (controls) controls.style.display = "";
      window.Game.go("home");
    };

    const skipBtn = el("button", {
      class: "intro-skip", text: "Skip ⏭",
      onClick: () => { window.GameAudio.playClick(); goHome(); },
    });

    const startBtn = el("button", {
      class: "btn btn-green btn-lg intro-start",
      text: "▶ Start",
      onClick: () => {
        if (started) return;
        started = true;
        startBtn.style.display = "none";
        video.play().catch(() => { /* if it fails, the Skip button still works */ });
      },
    });

    // When the film finishes, roll into the game.
    video.addEventListener("ended", goHome);

    const screen = el("div", { class: "intro-screen" }, [
      video,
      el("div", { class: "intro-overlay" }, [startBtn]),
      skipBtn,
    ]);

    mount(screen);
  }

  window.Screens = window.Screens || {};
  window.Screens.intro = { render };
})();
