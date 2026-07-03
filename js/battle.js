/* ============================================================================
 * battle.js — Real-time KOF-style team fighter
 * ----------------------------------------------------------------------------
 * Two fighters brawl on screen (yours on the left, enemy on the right). When a
 * fighter is KO'd, the next teammate walks in. When one team's 3 fighters are
 * all down, the other team wins.
 *
 * Controls (player):
 *   Move   ← →  (or A / D)      Jump  ↑ / W / Space
 *   Punch  J / F                Special ⭐  K / L  (when the star meter is full)
 * Plus on-screen touch buttons for tablets.
 *
 * Everything is data-driven: fighter art/colors come from characters.js, and a
 * character's `specialPower` (from SKILLS) decides its special move.
 * ==========================================================================*/

(function () {
  "use strict";

  /* ---- Tunable constants (kid-friendly feel) ------------------------------ */
  const MOVE_SPEED = 300;      // px/s
  const GRAVITY = 2200;        // px/s^2
  const JUMP_V = 820;          // px/s
  const GROUND_OFFSET = 34;    // px above arena bottom where feet rest

  const PUNCH_RANGE = 135;     // center-to-center px to connect
  const PUNCH_DMG = 12;
  const PUNCH_CD = 380;        // ms between punches
  const PUNCH_DUR = 300;       // ms the punch pose lasts
  const PUNCH_ACTIVE = 190;    // ms window a punch can connect
  const KNOCKBACK = 230;       // px/s pushed back when hit
  const HITSTUN = 300;         // ms unable to act after being hit

  const METER_MAX = 100;
  const METER_ON_HIT = 16;     // gained when you land a punch
  const METER_ON_HURT = 9;     // gained when you take a hit
  const SPECIAL_DMG = 30;
  const SELF_HEAL = 34;
  const PROJECTILE_SPEED = 640;

  const PLAYER_HP_BONUS = 1.2; // gentle home advantage — it's a kids' game

  /* ---- Module state ------------------------------------------------------- */
  const B = {
    running: false,
    raf: 0,
    last: 0,
    freeze: false,          // paused during KO / intro banners
    hitstopUntil: 0,        // brief freeze-frame on impact for punch weight
    arena: null,
    arenaW: 800,
    player: null,           // Team
    enemy: null,            // Team
    projectiles: [],
    keys: null,             // Set of held keys
    input: null,            // player edge-triggered intents
    onKeyDown: null,
    onKeyUp: null,
    dom: {},
  };

  /* ---- A Team = 3 characters, fighting one at a time ---------------------- */
  function makeTeam(chars, side) {
    return {
      side,                 // "player" | "enemy"
      chars,                // array of character records
      idx: 0,               // which fighter is out
      get ref() { return this.chars[this.idx]; },
      fighter: null,        // live Fighter for the current char
      startX: 0,
      facing: side === "player" ? 1 : -1,
      hud: null,            // {bar, meter, name, pips}
    };
  }

  function makeFighter(character, team) {
    const maxHp = Math.round(character.health * (team.side === "player" ? PLAYER_HP_BONUS : 1));
    return {
      ref: character,
      team,
      maxHp,
      hp: maxHp,
      x: team.startX,
      y: 0,               // height above ground
      vx: 0,
      vy: 0,
      grounded: true,
      facing: team.facing,
      meter: team.meterCarry || 0,   // super meter carries between fighters
      state: "idle",       // idle|walk|jump|punch|special|hurt|ko|enter
      stateT: 0,           // ms remaining in timed states
      punchCd: 0,
      attackActive: false,
      attackHasHit: false,
      invuln: 300,         // brief spawn protection (ms)
      // AI
      ai: { think: 0, wantRetreat: 0 },
      // DOM
      el: null,
      shadow: null,
    };
  }

  /* ========================================================================
   * Render + boot the fight
   * ======================================================================*/
  function render() {
    const { el, mount } = window.UI;
    const state = window.Game.state;

    B.player = makeTeam(state.playerTeam.slice(), "player");
    B.enemy = makeTeam(state.enemyTeam.slice(), "enemy");
    B.projectiles = [];
    B.freeze = true;

    // HUD (KOF-style bars top-left / top-right + team pips)
    const pHud = buildHud(B.player, "left");
    const eHud = buildHud(B.enemy, "right");

    // Painted stage backdrop + ambient animated shark (walks) and cat (eats).
    const arena = el("div", { class: "fight-arena" }, [
      el("div", { class: "fa-bg", style: { backgroundImage: "url('assets/background/backgroundnew.png')" } }),
      el("div", { class: "fa-shark" }, [el("img", { src: "assets/background/shark.png", alt: "shark" })]),
      el("div", { class: "fa-cat" }, [el("img", { src: "assets/background/cat.png", alt: "cat eating noodles" })]),
    ]);
    const banner = el("div", { class: "fight-banner" });
    arena.appendChild(banner);

    // Small quit button tucked in the stage corner (keeps the bottom clean).
    arena.appendChild(el("button", {
      class: "fight-quit-btn", title: "Quit", "aria-label": "Quit", text: "⬅",
      onClick: () => { window.GameAudio.playClick(); leave("home"); },
    }));

    const screen = el("div", { class: "fight-screen" }, [
      el("div", { class: "fight-hud" }, [pHud.root, el("div", { class: "vs-chip", text: "VS" }), eHud.root]),
      arena,
    ]);

    mount(screen);

    B.player.hud = pHud;
    B.enemy.hud = eHud;
    B.arena = arena;
    B.dom = { banner };

    // Measure arena and place fighters.
    const rect = arena.getBoundingClientRect();
    B.arenaW = rect.width;
    B.player.startX = B.arenaW * 0.24;
    B.enemy.startX = B.arenaW * 0.70;

    spawnFighter(B.player);
    spawnFighter(B.enemy);
    refreshHud(B.player);
    refreshHud(B.enemy);

    setupInput();

    // Intro: "FIGHT!" then unfreeze.
    showBanner("Round 1", 700, () => {
      showBanner("FIGHT!", 650, () => {
        B.freeze = false;
      });
    });

    B.running = true;
    B.last = performance.now();
    B.raf = requestAnimationFrame(loop);
  }

  /* ---- HUD ---------------------------------------------------------------- */
  function buildHud(team, sideClass) {
    const { el } = window.UI;
    const barFill = el("i");
    const meterFill = el("i");
    const name = el("div", { class: "fh-name" });
    const pips = el("div", { class: "fh-pips" });
    for (let i = 0; i < team.chars.length; i++) {
      pips.appendChild(el("span", { class: "pip" }));
    }
    const root = el("div", { class: "fighter-hud " + sideClass }, [
      name,
      el("div", { class: "fh-bar" }, [barFill]),
      el("div", { class: "fh-meter" }, [meterFill]),
      pips,
    ]);
    return { root, barFill, meterFill, name, pips };
  }

  function refreshHud(team) {
    const f = team.fighter;
    const hud = team.hud;
    const pct = Math.max(0, (f.hp / f.maxHp) * 100);
    hud.barFill.style.width = pct + "%";
    hud.barFill.className = pct <= 25 ? "crit" : pct <= 50 ? "low" : "";
    hud.meterFill.style.width = Math.min(100, (f.meter / METER_MAX) * 100) + "%";
    hud.meterFill.classList.toggle("full", f.meter >= METER_MAX);
    hud.name.textContent = f.ref.name;
    // Pips: fighters already used = dim, current = active.
    [...hud.pips.children].forEach((p, i) => {
      p.className = "pip" + (i < team.idx ? " down" : i === team.idx ? " active" : "");
    });
  }

  /* ---- Fighter DOM -------------------------------------------------------- */
  function spawnFighter(team) {
    const f = makeFighter(team.ref, team);
    team.fighter = f;
    team.meterCarry = 0;

    const { el, creatureGradient, portraitContent } = window.UI;
    const shadow = el("div", { class: "f-shadow" });
    const isSprite = window.GameData.isImagePath(f.ref.image);
    const body = el("div", {
      class: "f-body" + (isSprite ? " sprite" : ""),
      style: isSprite ? {} : { background: creatureGradient(f.ref) },
    }, [portraitContent(f.ref)]);
    const elFighter = el("div", { class: "fighter f-" + team.side }, [shadow, body]);
    f.el = elFighter;
    f.bodyEl = body;
    f.shadow = shadow;
    B.arena.appendChild(elFighter);
    positionFighter(f);
    return f;
  }

  function positionFighter(f) {
    f.el.style.left = f.x + "px";
    f.el.style.bottom = (GROUND_OFFSET + f.y) + "px";
    // translateX(-50%) centers the body/sprite over the anchor; scaleX flips facing.
    f.bodyEl.style.transform = `translateX(-50%) scaleX(${f.facing})`;
    // Shadow shrinks as the fighter jumps.
    const sc = Math.max(0.4, 1 - f.y / 500);
    f.shadow.style.transform = `translateX(-50%) scale(${sc})`;
    f.shadow.style.opacity = String(Math.max(0.15, 0.4 - f.y / 900));
  }

  /* ---- Input -------------------------------------------------------------- */
  function setupInput() {
    B.keys = new Set();
    B.input = { punch: false, special: false, jump: false };

    const LEFT = new Set(["arrowleft", "a"]);
    const RIGHT = new Set(["arrowright", "d"]);
    const JUMP = new Set(["arrowup", "w", " "]);
    const PUNCH = new Set(["j", "f"]);
    const SPECIAL = new Set(["k", "l"]);

    B.onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (LEFT.has(k) || RIGHT.has(k) || JUMP.has(k) || PUNCH.has(k) || SPECIAL.has(k)) e.preventDefault();
      if (B.keys.has(k)) return; // ignore auto-repeat for edge actions
      B.keys.add(k);
      if (JUMP.has(k)) B.input.jump = true;
      if (PUNCH.has(k)) B.input.punch = true;
      if (SPECIAL.has(k)) B.input.special = true;
    };
    B.onKeyUp = (e) => B.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", B.onKeyDown);
    window.addEventListener("keyup", B.onKeyUp);

    B._LEFT = LEFT; B._RIGHT = RIGHT;
  }

  function teardownInput() {
    if (B.onKeyDown) window.removeEventListener("keydown", B.onKeyDown);
    if (B.onKeyUp) window.removeEventListener("keyup", B.onKeyUp);
    B.onKeyDown = B.onKeyUp = null;
  }

  function readPlayerMove() {
    let dir = 0;
    for (const k of B.keys) {
      if (B._LEFT.has(k)) dir -= 1;
      if (B._RIGHT.has(k)) dir += 1;
    }
    // On-screen hold buttons:
    if (B.touch && B.touch.left) dir -= 1;
    if (B.touch && B.touch.right) dir += 1;
    return Math.max(-1, Math.min(1, dir));
  }

  function buildTouchControls() {
    const { el } = window.UI;
    B.touch = { left: false, right: false };

    const hold = (obj, key) => ({
      onpointerdown: (e) => { e.preventDefault(); obj[key] = true; },
      onpointerup: () => { obj[key] = false; },
      onpointerleave: () => { obj[key] = false; },
      onpointercancel: () => { obj[key] = false; },
    });

    function padBtn(label, cls, handlers) {
      const b = el("button", { class: "pad-btn " + cls, html: label });
      Object.entries(handlers).forEach(([ev, fn]) => b.addEventListener(ev.slice(2), fn));
      return b;
    }

    const leftBtn = padBtn("◀", "move", hold(B.touch, "left"));
    const rightBtn = padBtn("▶", "move", hold(B.touch, "right"));
    const jumpBtn = padBtn("⤒", "act jump", { onpointerdown: (e) => { e.preventDefault(); B.input.jump = true; } });
    const punchBtn = padBtn("👊", "act punch", { onpointerdown: (e) => { e.preventDefault(); B.input.punch = true; } });
    const specialBtn = padBtn("⭐", "act special", { onpointerdown: (e) => { e.preventDefault(); B.input.special = true; } });
    B.dom.specialBtn = specialBtn;

    return el("div", { class: "touch-controls" }, [
      el("div", { class: "pad-left" }, [leftBtn, rightBtn]),
      el("div", { class: "pad-right" }, [jumpBtn, punchBtn, specialBtn]),
    ]);
  }

  /* ========================================================================
   * Main loop
   * ======================================================================*/
  function loop(now) {
    if (!B.running) return;
    let dt = (now - B.last) / 1000;
    B.last = now;
    if (dt > 0.05) dt = 0.05; // clamp big frame gaps

    // Hit-stop: a tiny freeze-frame right after an impact makes hits feel weighty.
    const frozen = B.freeze || now < B.hitstopUntil;

    if (!frozen) {
      updatePlayer(B.player.fighter, dt);
      updateEnemyAI(B.enemy.fighter, dt);
      stepFighter(B.player.fighter, dt);
      stepFighter(B.enemy.fighter, dt);
      resolveHits();
      stepProjectiles(dt);
      faceOff();
    }

    positionFighter(B.player.fighter);
    positionFighter(B.enemy.fighter);
    // Passive meter trickle + HUD refresh.
    if (!frozen) {
      B.player.fighter.meter = Math.min(METER_MAX, B.player.fighter.meter + 4 * dt);
      B.enemy.fighter.meter = Math.min(METER_MAX, B.enemy.fighter.meter + 4 * dt);
    }
    refreshHud(B.player);
    refreshHud(B.enemy);
    syncSpecialBtn();

    // Consume edge inputs each frame.
    B.input.punch = B.input.special = B.input.jump = false;

    B.raf = requestAnimationFrame(loop);
  }

  function syncSpecialBtn() {
    if (B.dom.specialBtn) {
      B.dom.specialBtn.classList.toggle("ready", B.player.fighter.meter >= METER_MAX);
    }
  }

  /* ---- Player intent ------------------------------------------------------ */
  function updatePlayer(f, dt) {
    if (f.state === "ko" || f.state === "hurt") return;
    const move = readPlayerMove();

    if (canAct(f)) {
      if (move !== 0) {
        f.vx = move * MOVE_SPEED;
        if (f.grounded) setState(f, "walk");
      } else {
        f.vx = 0;
        if (f.grounded && f.state === "walk") setState(f, "idle");
      }
      if (B.input.jump && f.grounded) doJump(f);
      if (B.input.punch) doPunch(f);
      if (B.input.special && f.meter >= METER_MAX) doSpecial(f);
    }
  }

  /* ---- Enemy AI ----------------------------------------------------------- */
  function updateEnemyAI(f, dt) {
    if (f.state === "ko" || f.state === "hurt") return;
    const foe = B.player.fighter;
    const dx = foe.x - f.x;
    const dist = Math.abs(dx);
    const dir = dx > 0 ? 1 : -1;

    f.ai.think -= dt * 1000;

    if (!canAct(f)) return;

    // Retreat a little sometimes when foe is attacking & close.
    if (f.ai.wantRetreat > 0) {
      f.ai.wantRetreat -= dt * 1000;
      f.vx = -dir * MOVE_SPEED * 0.8;
      setState(f, "walk");
      return;
    }

    if (dist > PUNCH_RANGE * 0.82) {
      // Approach.
      f.vx = dir * MOVE_SPEED * 0.9;
      if (f.grounded) setState(f, "walk");
      // Occasional hop or special from range.
      if (f.ai.think <= 0) {
        f.ai.think = 500 + Math.random() * 700;
        if (f.meter >= METER_MAX && Math.random() < 0.6) doSpecial(f);
        else if (Math.random() < 0.15 && f.grounded) doJump(f);
      }
    } else {
      // In range: stop and punch on a relaxed timer.
      f.vx = 0;
      if (f.grounded && f.state === "walk") setState(f, "idle");
      if (f.ai.think <= 0) {
        f.ai.think = 320 + Math.random() * 380; // reaction delay → beatable
        if (foe.attackActive && Math.random() < 0.4) {
          f.ai.wantRetreat = 250 + Math.random() * 250;
        } else if (f.meter >= METER_MAX && Math.random() < 0.35) {
          doSpecial(f);
        } else {
          doPunch(f);
        }
      }
    }
  }

  /* ---- Actions ------------------------------------------------------------ */
  function canAct(f) {
    return f.state === "idle" || f.state === "walk" || f.state === "jump";
  }

  function setState(f, s) {
    if (f.state === s) return;
    f.state = s;
    f.el.classList.remove("st-walk", "st-punch", "st-special", "st-hurt", "st-ko", "st-jump");
    if (s !== "idle") f.el.classList.add("st-" + s);
  }

  function doJump(f) {
    f.vy = JUMP_V;
    f.grounded = false;
    setState(f, "jump");
  }

  function doPunch(f) {
    if (f.punchCd > 0) return;
    f.punchCd = PUNCH_CD;
    f.attackHasHit = false;
    f.attackActive = true;
    setState(f, "punch");
    f.stateT = PUNCH_DUR;
    window.GameAudio.playAttack();
  }

  function doSpecial(f) {
    f.meter = 0;
    f.attackHasHit = false;
    setState(f, "special");
    f.stateT = 500;
    window.GameAudio.playSpecial();
    window.UI.playAnim(f.el, "anim-flash", 400);

    const skill = window.GameData.skill(f.ref.specialPower);
    if (skill && skill.target === "self") {
      // Heal / shield style specials restore the fighter.
      f.hp = Math.min(f.maxHp, f.hp + SELF_HEAL);
      window.GameAudio.playHeal();
      window.UI.floatText(f.el, `+${SELF_HEAL}`, "heal");
      window.UI.burst(f.el, "#8affab", 14);
    } else {
      // Everything else launches a projectile of the skill's icon.
      launchProjectile(f, skill ? skill.icon : "💥");
    }
  }

  function launchProjectile(f, icon) {
    const { el } = window.UI;
    const p = {
      owner: f,
      side: f.team.side,
      x: f.x + f.facing * 60,
      y: f.y + 70,
      vx: f.facing * PROJECTILE_SPEED,
      dmg: SPECIAL_DMG,
      dead: false,
      el: el("div", { class: "projectile", text: icon }),
    };
    p.el.style.left = p.x + "px";
    p.el.style.bottom = (GROUND_OFFSET + p.y) + "px";
    B.arena.appendChild(p.el);
    B.projectiles.push(p);
  }

  /* ---- Physics / state timers -------------------------------------------- */
  function stepFighter(f, dt) {
    if (f.invuln > 0) f.invuln -= dt * 1000;
    if (f.punchCd > 0) f.punchCd -= dt * 1000;

    // Timed states.
    if (f.stateT > 0) {
      f.stateT -= dt * 1000;
      if (f.state === "punch" && PUNCH_DUR - f.stateT > PUNCH_ACTIVE) f.attackActive = false;
      if (f.stateT <= 0 && f.state !== "ko") {
        f.attackActive = false;
        setState(f, f.grounded ? "idle" : "jump");
      }
    }

    // Horizontal.
    f.x += f.vx * dt;
    // Friction for knockback / hurt slides.
    if (f.state === "hurt" || !canAct(f)) f.vx *= 0.86;

    // Vertical (gravity + jump).
    if (!f.grounded || f.vy > 0) {
      f.vy -= GRAVITY * dt;
      f.y += f.vy * dt;
      if (f.y <= 0) {
        f.y = 0; f.vy = 0; f.grounded = true;
        if (f.state === "jump") setState(f, "idle");
      }
    }

    // Keep inside the arena.
    const margin = 46;
    f.x = Math.max(margin, Math.min(B.arenaW - margin, f.x));
  }

  function faceOff() {
    const p = B.player.fighter, e = B.enemy.fighter;
    if (canAct(p)) p.facing = e.x >= p.x ? 1 : -1;
    if (canAct(e)) e.facing = p.x >= e.x ? 1 : -1;
  }

  /* ---- Hit resolution ----------------------------------------------------- */
  function resolveHits() {
    tryPunch(B.player.fighter, B.enemy.fighter);
    tryPunch(B.enemy.fighter, B.player.fighter);
  }

  function tryPunch(att, def) {
    if (!att.attackActive || att.attackHasHit) return;
    if (def.state === "ko" || def.invuln > 0) return;
    const dx = def.x - att.x;
    if (Math.sign(dx) !== att.facing && dx !== 0) return; // must face the target
    if (Math.abs(dx) <= PUNCH_RANGE && Math.abs(def.y - att.y) < 90) {
      att.attackHasHit = true;
      applyHit(att, def, PUNCH_DMG, att.facing);
      att.meter = Math.min(METER_MAX, att.meter + METER_ON_HIT);
    }
  }

  function applyHit(att, def, dmg, dir) {
    const big = dmg >= SPECIAL_DMG;
    def.hp = Math.max(0, def.hp - dmg);
    def.vx = dir * KNOCKBACK * (big ? 1.4 : 1);
    def.meter = Math.min(METER_MAX, def.meter + METER_ON_HURT);
    window.GameAudio.playHit();

    // Juice: impact spark, particles, floating damage, freeze-frame + screen shake.
    window.UI.spark(def.el, big ? "💥" : "✨");
    window.UI.burst(def.el, big ? "#ffe066" : "#ff8fa3", big ? 18 : 10);
    window.UI.floatText(def.el, `-${dmg}`, big ? "crit" : "");
    window.UI.playAnim(def.el, "anim-hurt", 300);
    shakeArena(big ? "lg" : "sm");
    B.hitstopUntil = performance.now() + (big ? 120 : 70);

    if (def.hp <= 0) {
      startKO(def);
    } else {
      setState(def, "hurt");
      def.stateT = HITSTUN;
    }
  }

  // Briefly shake the whole stage for punch impact ("sm") or big hits/KO ("lg").
  function shakeArena(size) {
    const a = B.arena;
    if (!a) return;
    a.classList.remove("shake-sm", "shake-lg");
    void a.offsetWidth; // restart the animation
    a.classList.add("shake-" + size);
    setTimeout(() => a.classList.remove("shake-" + size), size === "lg" ? 340 : 200);
  }

  /* ---- Projectiles -------------------------------------------------------- */
  function stepProjectiles(dt) {
    const foeOf = (side) => (side === "player" ? B.enemy.fighter : B.player.fighter);
    for (const p of B.projectiles) {
      if (p.dead) continue;
      p.x += p.vx * dt;
      p.el.style.left = p.x + "px";
      const target = foeOf(p.side);
      if (target.state !== "ko" && target.invuln <= 0 &&
          Math.abs(target.x - p.x) < 60 && Math.abs((target.y + 70) - (p.y)) < 90) {
        applyHit(p.owner, target, p.dmg, Math.sign(p.vx) || 1);
        killProjectile(p);
      } else if (p.x < -40 || p.x > B.arenaW + 40) {
        killProjectile(p);
      }
    }
    B.projectiles = B.projectiles.filter((p) => !p.dead);
  }

  function killProjectile(p) {
    p.dead = true;
    if (p.el && p.el.parentNode) p.el.remove();
  }

  /* ---- KO & tag-in -------------------------------------------------------- */
  function startKO(f) {
    setState(f, "ko");
    f.vx = 0;
    f.attackActive = false;
    B.freeze = true;
    window.UI.burst(f.el, "#c9b8ff", 22);
    window.UI.spark(f.el, "💫");
    shakeArena("lg");
    window.GameAudio.playHit();

    // Reflect on pips immediately.
    f.team.idx = f.team.idx; // (current index still "out" visually until swap)
    refreshHud(f.team);

    showBanner("K.O.!", 900, () => {
      f.el.remove();
      const team = f.team;
      team.idx += 1;
      if (team.idx >= team.chars.length) {
        endMatch(team.side === "player" ? "enemy" : "player");
        return;
      }
      // Carry a little meter to the next fighter so specials stay reachable.
      team.meterCarry = 0;
      spawnFighter(team);
      refreshHud(team);
      showBanner(`${team.fighter.ref.name} steps up!`, 800, () => {
        B.freeze = false;
      });
    });
  }

  function endMatch(winnerSide) {
    const playerWon = winnerSide === "player";
    showBanner(playerWon ? "YOU WIN!" : "YOU LOSE…", 1100, () => {
      leave("result", { playerWon });
    });
  }

  /* ---- Banner ------------------------------------------------------------- */
  function showBanner(text, ms, done) {
    const b = B.dom.banner;
    b.textContent = text;
    b.classList.remove("show");
    // reflow to restart animation
    void b.offsetWidth;
    b.classList.add("show");
    setTimeout(() => {
      b.classList.remove("show");
      if (done) done();
    }, ms);
  }

  /* ---- Teardown / navigation --------------------------------------------- */
  function leave(screen, data) {
    stopBattle();
    window.Game.go(screen, data);
  }

  function stopBattle() {
    B.running = false;
    if (B.raf) cancelAnimationFrame(B.raf);
    B.raf = 0;
    teardownInput();
    B.projectiles.forEach((p) => p.el && p.el.remove());
    B.projectiles = [];
  }

  window.Screens = window.Screens || {};
  window.Screens.battle = { render };
})();
