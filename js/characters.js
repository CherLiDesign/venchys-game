/* ============================================================================
 * characters.js — Centralized game data (Venchy's real cast)
 * ----------------------------------------------------------------------------
 * The 8 creatures, their Happy/Angry forms, stats, colors and special powers
 * are all defined here — nothing about them is hardcoded in the UI.
 *
 * Art: transparent PNG sprites cut out of Venchy's character design sheets,
 * stored in /assets/images. Stats & specials were taken from those sheets.
 *
 * To tweak a creature:   edit its entry in PAIRS.
 * To add a creature:     add a new PAIRS entry (+ two sprite files).
 * To add/return a power: add an entry to SKILLS.
 * ==========================================================================*/

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
   * SKILLS — each creature's canonical special power (from its design sheet).
   *
   * The real-time fighter only needs `icon` + `target` ("self" heals the
   * fighter; anything else fires a projectile of the icon). The `use(ctx)`
   * body is kept for a possible turn-based mode and documents each effect.
   * ------------------------------------------------------------------------*/
  const SKILLS = {
    flameShot: {
      id: "flameShot", name: "Flame Shot", icon: "🔥", target: "enemy",
      description: "Shoots a blazing fireball.",
      use(ctx) { ctx.engine.dealDamage(ctx.target, Math.round(ctx.caster.stats.attack * 1.8), { source: ctx.caster, ignoreDefense: true, label: "Flame!" }); },
    },
    purpleBlast: {
      id: "purpleBlast", name: "Purple Blast", icon: "🔮", target: "enemy",
      description: "Blasts arcane purple energy from afar.",
      use(ctx) { ctx.engine.dealDamage(ctx.target, Math.round(ctx.caster.stats.attack * 1.7), { source: ctx.caster, label: "Blast!" }); },
    },
    shadowClaw: {
      id: "shadowClaw", name: "Shadow Claw", icon: "🌑", target: "enemy",
      description: "Slashes twice with razor-sharp shadow claws.",
      use(ctx) {
        ctx.engine.dealDamage(ctx.target, ctx.caster.stats.attack, { source: ctx.caster, label: "Slash 1" });
        if (ctx.target.hp > 0) ctx.engine.dealDamage(ctx.target, ctx.caster.stats.attack, { source: ctx.caster, label: "Slash 2" });
      },
    },
    systemBoost: {
      id: "systemBoost", name: "System Boost", icon: "🛡️", target: "self",
      description: "Powers up with a protective shield.",
      use(ctx) { ctx.engine.shield(ctx.caster, 45); },
    },
    sunshineHeal: {
      id: "sunshineHeal", name: "Sunshine Heal", icon: "☀️", target: "self",
      description: "Soaks up sunshine to restore health.",
      use(ctx) { ctx.engine.heal(ctx.caster, 40); },
    },
    earthSlam: {
      id: "earthSlam", name: "Earth Slam", icon: "🪨", target: "enemy",
      description: "Slams the ground for heavy damage.",
      use(ctx) { ctx.engine.dealDamage(ctx.target, Math.round(ctx.caster.stats.attack * 2.1), { source: ctx.caster, label: "SLAM!" }); },
    },
    dash: {
      id: "dash", name: "Dash", icon: "💨", target: "enemy",
      description: "Dashes forward in a lightning-fast strike.",
      use(ctx) { ctx.engine.dealDamage(ctx.target, Math.round(ctx.caster.stats.attack * 1.6), { source: ctx.caster, label: "Dash!" }); },
    },
    toxicBloom: {
      id: "toxicBloom", name: "Toxic Bloom", icon: "☠️", target: "enemy",
      description: "Releases a cloud of poison that lingers.",
      use(ctx) {
        ctx.engine.dealDamage(ctx.target, Math.round(ctx.caster.stats.attack * 0.7), { source: ctx.caster });
        ctx.engine.addStatus(ctx.target, { type: "poison", turns: 3, power: 10 });
      },
    },
  };

  /* --------------------------------------------------------------------------
   * PAIRS — one entry per creature, each with a Happy and Angry form.
   * `image` points at the cut-out sprite; `color`/`accent` drive the UI cards.
   * Stats are scaled from the design-sheet battle bars.
   * ------------------------------------------------------------------------*/
  const IMG = "assets/images/";
  const PAIRS = [
    {
      id: "brud", name: "Brud",            // Fighter · Flame Shot
      stats: { health: 110, attack: 22, defense: 9, speed: 15, crit: 14 },
      skill: "flameShot",
      happy: { image: IMG + "brud_happy.png", color: "#e8722a", accent: "#f6b072" },
      angry: { image: IMG + "brud_angry.png", color: "#c0451c", accent: "#e87a3a" },
    },
    {
      id: "durple", name: "Durple",        // Mage / Ranged · Purple Blast
      stats: { health: 105, attack: 22, defense: 9, speed: 18, crit: 16 },
      skill: "purpleBlast",
      happy: { image: IMG + "durple_happy.png", color: "#6a2fb8", accent: "#9a6fe0" },
      angry: { image: IMG + "durple_angry.png", color: "#4e1f8f", accent: "#7d4fc0" },
    },
    {
      id: "gray", name: "Grey",            // Fighter / Assassin · Shadow Claw
      stats: { health: 95, attack: 26, defense: 8, speed: 22, crit: 20 },
      skill: "shadowClaw",
      happy: { image: IMG + "gray_happy.png", color: "#41464e", accent: "#767c86" },
      angry: { image: IMG + "gray_angry.png", color: "#6b7078", accent: "#9aa0a8" },
    },
    {
      id: "computer", name: "Mr. Funcomp", // Support / Tech · System Boost
      stats: { health: 130, attack: 16, defense: 15, speed: 12, crit: 9 },
      skill: "systemBoost",
      happy: { image: IMG + "computer_happy.png", color: "#8b9298", accent: "#c0c6cc" },
      angry: { image: IMG + "computer_angry.png", color: "#3a3f45", accent: "#6a7078" },
    },
    {
      id: "sun", name: "Mr. Sun",          // Support / Healer · Sunshine Heal
      stats: { health: 115, attack: 18, defense: 13, speed: 16, crit: 11 },
      skill: "sunshineHeal",
      happy: { image: IMG + "sun_happy.png", color: "#f2b62e", accent: "#ffe08a" },
      angry: { image: IMG + "sun_angry.png", color: "#e0961a", accent: "#ffcf5e" },
    },
    {
      id: "owackx", name: "Owackx",        // Tank / Defender · Earth Slam
      stats: { health: 140, attack: 19, defense: 16, speed: 9, crit: 8 },
      skill: "earthSlam",
      happy: { image: IMG + "owackx_happy.png", color: "#4e9e3a", accent: "#86cf62" },
      angry: { image: IMG + "owackx_angry.png", color: "#3c8f2c", accent: "#74c24f" },
    },
    {
      id: "raddy", name: "Raddy",          // Attacker / Agile · Dash
      stats: { health: 100, attack: 25, defense: 8, speed: 20, crit: 18 },
      skill: "dash",
      happy: { image: IMG + "raddy_happy.png", color: "#c0392b", accent: "#e0685a" },
      angry: { image: IMG + "raddy_angry.png", color: "#9e2b20", accent: "#d2564a" },
    },
    {
      id: "veneria", name: "Venera",       // Support / Poisoner · Toxic Bloom
      stats: { health: 115, attack: 19, defense: 12, speed: 17, crit: 13 },
      skill: "toxicBloom",
      happy: { image: IMG + "veneria_happy.png", color: "#3f8f3a", accent: "#79c06a" },
      angry: { image: IMG + "veneria_angry.png", color: "#2f7a2c", accent: "#63b055" },
    },
  ];

  // Angry forms hit a little harder but are a little frailer — flavor, not power.
  const ANGRY_TILT = { health: -6, attack: +3, defense: +1, speed: +1, crit: +2 };

  function buildCharacter(pair, form) {
    const look = pair[form];
    const tilt = form === "angry" ? ANGRY_TILT : { health: 0, attack: 0, defense: 0, speed: 0, crit: 0 };
    return {
      id: `${pair.id}_${form}`,
      pairId: pair.id,
      name: pair.name,       // proper name; you only ever see one form at a time
      form,                  // "happy" | "angry"
      health: pair.stats.health + tilt.health,
      attack: pair.stats.attack + tilt.attack,
      defense: pair.stats.defense + tilt.defense,
      speed: pair.stats.speed + tilt.speed,
      crit: pair.stats.crit + tilt.crit,
      specialPower: pair.skill,
      image: look.image,     // path to a cut-out sprite (auto-detected as <img>)
      color: look.color,
      accent: look.accent,
    };
  }

  const CHARACTERS = [];
  PAIRS.forEach((pair) => {
    CHARACTERS.push(buildCharacter(pair, "happy"));
    CHARACTERS.push(buildCharacter(pair, "angry"));
  });

  const GameData = {
    SKILLS,
    CHARACTERS,
    byForm(form) { return CHARACTERS.filter((c) => c.form === form); },
    byId(id) { return CHARACTERS.find((c) => c.id === id); },
    skill(id) { return SKILLS[id]; },
    isImagePath(image) { return typeof image === "string" && /\.(png|jpe?g|gif|svg|webp)$/i.test(image); },
  };

  window.GameData = GameData;
})();
