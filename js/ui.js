/* ============================================================================
 * ui.js — Reusable view helpers & visual effects
 * ----------------------------------------------------------------------------
 * Screen modules (story/selection/battle) build their DOM with these helpers
 * instead of string templates, so components stay reusable and easy to restyle.
 * Also owns the FX layer (floating numbers, particles, confetti).
 * ==========================================================================*/

(function () {
  "use strict";

  const stage = () => document.getElementById("game");
  const fxLayer = () => document.getElementById("fx-layer");

  /** Tiny hyperscript-style element factory. */
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === "dataset") {
        Object.assign(node.dataset, v);
      } else {
        node.setAttribute(k, v);
      }
    }
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  /** Swap the current screen for a freshly built one. */
  function mount(screenNode) {
    const s = stage();
    s.innerHTML = "";
    screenNode.classList.add("screen");
    s.appendChild(screenNode);
    return screenNode;
  }

  /** Render a creature's placeholder art: emoji text OR <img> if it's a path. */
  function portraitContent(character) {
    if (window.GameData.isImagePath(character.image)) {
      return el("img", { src: character.image, alt: character.name });
    }
    return document.createTextNode(character.image);
  }

  /** Gradient background derived from a creature's palette. */
  function creatureGradient(character) {
    return `linear-gradient(160deg, ${character.accent}, ${character.color})`;
  }

  /**
   * A selectable creature card (used in character selection).
   * opts: { selected, onClick }
   */
  function creatureCard(character, opts = {}) {
    const skill = window.GameData.skill(character.specialPower);
    const card = el("div", {
      class: "creature-card" + (opts.selected ? " selected" : ""),
      onClick: opts.onClick,
    }, [
      el("div", { class: "check", text: "✓" }),
      el("div", {
        class: "portrait",
        style: { background: creatureGradient(character) },
      }, [portraitContent(character)]),
      el("div", { class: "cname", text: character.name }),
      el("div", { class: "stat-line" }, [
        el("span", { class: "s", html: `❤️ ${character.health}` }),
        el("span", { class: "s", html: `⚔️ ${character.attack}` }),
        el("span", { class: "s", html: `🛡️ ${character.defense}` }),
      ]),
      el("div", { class: "power-chip", html: `${skill.icon} ${skill.name}` }),
    ]);
    return card;
  }

  /* ---- FX: floating numbers, particles, confetti --------------------------- */

  /** Center point of an element in viewport coords. */
  function centerOf(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /** Pop a floating number/label above a target element. */
  function floatText(targetNode, text, kind = "") {
    if (!targetNode) return;
    const { x, y } = centerOf(targetNode);
    const node = el("div", {
      class: "float-dmg " + kind,
      style: { left: x + "px", top: y + "px" },
      text: text,
    });
    fxLayer().appendChild(node);
    setTimeout(() => node.remove(), 950);
  }

  /** Burst of colored particles at a target element. */
  function burst(targetNode, color = "#ffd95e", count = 12) {
    if (!targetNode) return;
    const { x, y } = centerOf(targetNode);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + i;
      const dist = 40 + (i % 4) * 14;
      const p = el("div", {
        class: "particle",
        style: {
          left: x + "px",
          top: y + "px",
          background: color,
          "--dx": Math.cos(angle) * dist + "px",
          "--dy": Math.sin(angle) * dist + "px",
        },
      });
      fxLayer().appendChild(p);
      setTimeout(() => p.remove(), 720);
    }
  }

  /** Pop an impact spark (💥) centered on a target — punchy hit feedback. */
  function spark(targetNode, glyph = "💥") {
    if (!targetNode) return;
    const { x, y } = centerOf(targetNode);
    const node = el("div", {
      class: "hit-spark",
      style: { left: x + "px", top: y + "px" },
      text: glyph,
    });
    fxLayer().appendChild(node);
    setTimeout(() => node.remove(), 380);
  }

  /** Rain confetti for a win. */
  function confetti(count = 80) {
    const colors = ["#ffd95e", "#ff9ec4", "#7ec8ff", "#6ee89b", "#a06bff"];
    for (let i = 0; i < count; i++) {
      const dur = 2 + (i % 5) * 0.4;
      const piece = el("div", {
        class: "confetti-piece",
        style: {
          left: (i / count) * 100 + "vw",
          background: colors[i % colors.length],
          animationDuration: dur + "s",
          animationDelay: (i % 10) * 0.15 + "s",
          borderRadius: i % 2 ? "50%" : "2px",
        },
      });
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), (dur + 2) * 1000);
    }
  }

  /** Small brief play of a CSS animation class, resolved when done. */
  function playAnim(node, className, ms = 420) {
    return new Promise((resolve) => {
      if (!node) return resolve();
      node.classList.add(className);
      setTimeout(() => {
        node.classList.remove(className);
        resolve();
      }, ms);
    });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  window.UI = {
    el,
    mount,
    stage,
    portraitContent,
    creatureGradient,
    creatureCard,
    floatText,
    burst,
    spark,
    confetti,
    playAnim,
    wait,
  };
})();
