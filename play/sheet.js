/* ============================================================
   RETURN TO DOLMENWOOD — interactive character sheet
   sheet.js — renderer, dice roller, and localStorage trackers

   Dolmenwood / Old-School Essentials mechanics:
   · Ability check — roll d20, success if result ≤ ability score
   · Saving throw  — roll d20, success if result ≥ save value
   · Skill (X-in-6)— roll d6,  success if result ≤ target
   · Attack roll   — d20 + attack bonus (+ modifiers), vs target AC
   ============================================================ */
(function () {
  "use strict";

  var DATA = JSON.parse(document.getElementById("sheet-data").textContent);
  var STORE_KEY = "rtd:sheet:" + DATA.id + ":v1";
  var root = document.getElementById("sheet");

  /* ---- persistent state ---- */
  var state = loadState();
  function loadState() {
    var base = {
      hp: DATA.hp,
      exhaustion: 0,
      coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
      runeUses: {},
      log: []
    };
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && typeof saved === "object") {
        base.hp = clampNum(saved.hp, 0, DATA.hp, DATA.hp);
        base.exhaustion = clampNum(saved.exhaustion, 0, 999, 0);
        if (saved.coins) base.coins = Object.assign(base.coins, saved.coins);
        if (saved.runeUses) base.runeUses = saved.runeUses;
        if (Array.isArray(saved.log)) base.log = saved.log.slice(0, 40);
      }
    } catch (e) { /* ignore corrupt store */ }
    return base;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function clampNum(v, lo, hi, dflt) {
    v = Number(v);
    if (!isFinite(v)) return dflt;
    return Math.max(lo, Math.min(hi, v));
  }

  /* ---- dice ---- */
  function d(n) { return Math.floor(Math.random() * n) + 1; }
  function rollN(n, sides) {
    var rolls = [], sum = 0;
    for (var i = 0; i < n; i++) { var r = d(sides); rolls.push(r); sum += r; }
    return { rolls: rolls, sum: sum };
  }

  /* ---- labels ---- */
  var ABIL_ORDER = ["strength", "intelligence", "wisdom", "dexterity", "constitution", "charisma"];
  var ABIL_SHORT = { strength: "Str", intelligence: "Int", wisdom: "Wis", dexterity: "Dex", constitution: "Con", charisma: "Cha" };
  var SAVE_ORDER = ["doom", "ray", "hold", "blast", "spell"];
  var SAVE_LABEL = { doom: "Doom", ray: "Ray", hold: "Hold", blast: "Blast", spell: "Spell" };
  var SKILL_LABEL = { listen: "Listen", search: "Search", survival: "Survival", detectMagic: "Detect Magic" };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function signed(n) { return (n >= 0 ? "+" : "") + n; }

  /* ============================================================ render */
  function render() {
    var a = DATA.abilities, primes = DATA.primeAbilities || [];

    var abilityBtns = ABIL_ORDER.map(function (k) {
      var sc = a[k].score, mod = a[k].mod, isPrime = primes.indexOf(k) >= 0;
      return '<button class="rollbtn' + (isPrime ? " prime" : "") + '" data-roll="ability" data-key="' + k + '">' +
        '<span class="lbl">' + ABIL_SHORT[k] + '</span>' +
        '<span class="val">' + sc + '</span>' +
        '<span class="sub">mod ' + signed(mod) + '</span></button>';
    }).join("");

    var saveBtns = SAVE_ORDER.map(function (k) {
      var s = DATA.saves[k];
      return '<button class="rollbtn" data-roll="save" data-key="' + k + '" title="' + esc(s.desc) + '">' +
        '<span class="lbl">' + SAVE_LABEL[k] + '</span>' +
        '<span class="val">' + s.target + '</span>' +
        '<span class="sub">roll ≥</span></button>';
    }).join("");

    var skillBtns = Object.keys(DATA.skills).map(function (k) {
      var s = DATA.skills[k];
      return '<button class="rollbtn skill" data-roll="skill" data-key="' + k + '" title="' + esc(s.desc) + '">' +
        '<span class="lbl">' + (SKILL_LABEL[k] || k) + '</span>' +
        '<span class="val">' + s.target + '<span style="font-size:.6em">-in-6</span></span></button>';
    }).join("");

    var runeCards = (DATA.runes || []).map(function (rn, i) {
      var used = state.runeUses[i] || 0;
      return '<div class="rune-card">' +
        '<span class="rk">Rune · ' + esc(rn.magnitude) + ' Magnitude</span>' +
        '<h3>' + esc(rn.name) + '</h3>' +
        rn.lines.map(function (l) { return "<p>" + l + "</p>"; }).join("") +
        '<div class="rune-uses"><button class="step" data-rune-dec="' + i + '">–</button>' +
        '<span>used today <b data-rune-val="' + i + '">' + used + '</b></span>' +
        '<button class="step" data-rune-inc="' + i + '">+</button></div></div>';
    }).join("");

    var gearRows = DATA.gear.map(function (g) {
      return '<li><span>' + esc(g.name) + '</span>' + (g.tag ? '<span class="tag">' + esc(g.tag) + '</span>' : '') + '</li>';
    }).join("");

    var coinRows = ["pp", "gp", "sp", "cp"].map(function (c) {
      return '<div class="coin"><span class="lbl">' + c + '</span>' +
        '<input type="number" data-coin="' + c + '" value="' + (state.coins[c] || 0) + '" min="0"></div>';
    }).join("");

    root.innerHTML =
      '<div class="sheet-head">' +
        '<img class="tok" src="' + DATA.token + '" alt="' + esc(DATA.name) + '">' +
        '<div><h1>' + esc(DATA.name) + '</h1>' +
          '<div class="sub">' + esc(DATA.kindred) + ' ' + esc(DATA.class) + ' · Level ' + DATA.level +
          ' · <span class="align">' + esc(DATA.alignment) + '</span></div></div>' +
      '</div>' +

      '<div class="sheet-grid">' +
      '<div class="sheet-col">' +

        /* vitals */
        '<div class="sc"><h2>Vitals</h2>' +
          '<div class="vitals">' +
            '<div class="vital hp-box"><span class="lbl">Hit Points</span>' +
              '<div class="hp-line"><button class="step" id="hpDown">–</button>' +
              '<span class="hp-cur" id="hpCur">' + state.hp + '</span>' +
              '<span class="hp-max">/ ' + DATA.hp + '</span>' +
              '<button class="step" id="hpUp">+</button></div>' +
              '<div class="hp-bar"><i id="hpBar"></i></div></div>' +
            '<div class="vital"><span class="lbl">Armour Class</span><span class="val">' + DATA.ac + '</span></div>' +
            '<div class="vital"><span class="lbl">Attack</span><span class="val">' + signed(DATA.attackBonus) + '</span></div>' +
            '<div class="vital"><span class="lbl">Exhaustion</span>' +
              '<div class="hp-line"><button class="step" id="exDown">–</button>' +
              '<span class="hp-cur" id="exVal" style="color:var(--moon)">' + state.exhaustion + '</span>' +
              '<button class="step" id="exUp">+</button></div></div>' +
          '</div>' +
          '<div class="xp-line" style="margin-top:.8rem">Speed <b>' + DATA.speed.round + ' ft</b> · exploring ' + DATA.speed.exploring + ' ft · overland ' + DATA.speed.overland + ' mi &nbsp;·&nbsp; XP <b>' + DATA.xp.value.toLocaleString() + '</b> / ' + DATA.xp.next.toLocaleString() + '</div>' +
        '</div>' +

        /* abilities */
        '<div class="sc"><h2>Ability Checks <span class="hint">tap — roll d20, succeed on ≤ score</span></h2>' +
          '<div class="btn-grid abilities">' + abilityBtns + '</div></div>' +

        /* saves */
        '<div class="sc"><h2>Saving Throws <span class="hint">tap — roll d20, succeed on ≥ value</span></h2>' +
          '<div class="btn-grid saves-grid">' + saveBtns + '</div></div>' +

        /* attack + skills */
        '<div class="sc"><h2>Actions</h2>' +
          '<button class="actbtn" data-roll="attack" style="margin-bottom:.9rem">⚔ Attack Roll — d20 ' + signed(DATA.attackBonus) + '</button>' +
          '<h2 style="border:0;margin:.2rem 0 .7rem;padding:0">Skills <span class="hint">tap — roll d6, succeed on ≤ target</span></h2>' +
          '<div class="btn-grid skills-grid">' + skillBtns + '</div></div>' +

        /* runes */
        (runeCards ? '<div class="sc"><h2>Runes &amp; Sigils</h2>' + runeCards +
          '<button class="actbtn alt" id="runeRest" style="margin-top:.9rem">☾ Rest — clear rune uses</button></div>' : '') +

        /* gear + coin */
        '<div class="sc"><h2>Gear <span class="hint">capacity ' + DATA.encumbrance.max + '</span></h2>' +
          '<ul class="gearlist">' + gearRows + '</ul>' +
          '<h2 style="border:0;margin:1rem 0 .6rem;padding:0">Coin</h2>' +
          '<div class="coins">' + coinRows + '</div></div>' +

      '</div>' +

      /* ---- right rail ---- */
      '<div class="rail">' +
        '<div class="sc"><h2>The Cast</h2>' +
          '<div class="readout empty" id="readout"><div class="what">Ready</div><div class="total">—</div><div class="detail">Tap any stat, or a die below.</div></div>' +
          '<div class="dice-tray">' +
            ["d4", "d6", "d8", "d10", "d12", "d20", "d100"].map(function (dd) {
              return '<button class="die" data-die="' + dd.slice(1) + '">' + dd + '</button>';
            }).join("") +
            '<button class="die" data-die="6" data-count="3" title="Roll 3d6">3d6</button>' +
          '</div>' +
          '<div class="custom-roll"><input id="customInput" placeholder="e.g. 2d6+1" aria-label="Custom dice"><button id="customBtn">Roll</button></div>' +
        '</div>' +
        '<div class="sc"><h2>Roll Log <button class="log-clear" id="logClear">clear</button></h2>' +
          '<div class="log" id="log"></div></div>' +
        '<div class="reset-row"><button id="resetAll">Reset trackers</button></div>' +
      '</div>' +

      '</div>' +
      '<div class="playfoot">❦ Trackers save to this browser · rules per Dolmenwood / Old-School Essentials</div>';

    updateHpBar();
    renderLog();
    bind();
  }

  /* ============================================================ interactions */
  function updateHpBar() {
    var el = document.getElementById("hpBar");
    if (el) el.style.width = Math.max(0, Math.min(100, (state.hp / DATA.hp) * 100)) + "%";
    var cur = document.getElementById("hpCur");
    if (cur) cur.textContent = state.hp;
    var ex = document.getElementById("exVal");
    if (ex) ex.textContent = state.exhaustion;
  }

  function setReadout(what, total, detail, verdict) {
    var r = document.getElementById("readout");
    r.className = "readout flash";
    r.innerHTML = '<div class="what">' + esc(what) + '</div>' +
      '<div class="total">' + total + '</div>' +
      '<div class="detail">' + detail + '</div>' +
      (verdict ? '<div class="verdict ' + verdict.cls + '">' + verdict.text + '</div>' : '');
    // retrigger flash animation
    void r.offsetWidth;
    r.classList.add("flash");
  }

  function pushLog(what, result, cls) {
    state.log.unshift({ w: what, r: result, c: cls || "" });
    state.log = state.log.slice(0, 40);
    save();
    renderLog();
  }
  function renderLog() {
    var el = document.getElementById("log");
    if (!el) return;
    if (!state.log.length) { el.innerHTML = '<div class="le"><span class="lw" style="color:var(--moon-faint)">No rolls yet.</span></div>'; return; }
    el.innerHTML = state.log.map(function (e) {
      return '<div class="le"><span class="lw">' + esc(e.w) + '</span><span class="lr ' + e.c + '">' + esc(e.r) + '</span></div>';
    }).join("");
  }

  /* roll handlers */
  function rollAbility(key) {
    var sc = DATA.abilities[key].score;
    var r = d(20);
    var ok = r <= sc;
    var verdict = { cls: ok ? "hit" : "miss", text: ok ? "Success" : "Failure" };
    setReadout(ABIL_SHORT[key] + " Check", r, "d20 vs score " + sc + " · need ≤ " + sc, verdict);
    pushLog(ABIL_SHORT[key] + " check (d20≤" + sc + ")", r + " " + (ok ? "✓" : "✗"), ok ? "hit" : "miss");
  }
  function rollSave(key) {
    var s = DATA.saves[key], r = d(20);
    var ok = r >= s.target;
    var verdict = { cls: ok ? "hit" : "miss", text: ok ? "Saved" : "Failed" };
    setReadout(SAVE_LABEL[key] + " Save", r, "d20 vs " + s.target + " · need ≥ " + s.target, verdict);
    pushLog(SAVE_LABEL[key] + " save (d20≥" + s.target + ")", r + " " + (ok ? "✓" : "✗"), ok ? "hit" : "miss");
  }
  function rollSkill(key) {
    var s = DATA.skills[key], r = d(6);
    var ok = r <= s.target;
    var verdict = { cls: ok ? "hit" : "miss", text: ok ? "Success" : "Failure" };
    setReadout((SKILL_LABEL[key] || key), r, "d6 · " + s.target + "-in-6 · need ≤ " + s.target, verdict);
    pushLog((SKILL_LABEL[key] || key) + " (" + s.target + "-in-6)", r + " " + (ok ? "✓" : "✗"), ok ? "hit" : "miss");
  }
  function rollAttack() {
    var r = d(20), tot = r + DATA.attackBonus;
    var nat = r === 20 ? " · natural 20!" : (r === 1 ? " · natural 1" : "");
    setReadout("Attack Roll", tot, "d20 (" + r + ") " + signed(DATA.attackBonus) + nat + " · vs target AC", null);
    pushLog("Attack (d20" + signed(DATA.attackBonus) + ")", String(tot), r === 20 ? "hit" : (r === 1 ? "miss" : ""));
  }
  function rollPlainDie(sides, count) {
    count = count || 1;
    var res = rollN(count, sides);
    var label = count + "d" + sides;
    var detail = count > 1 ? "[" + res.rolls.join(", ") + "]" : "single d" + sides;
    setReadout(label, res.sum, detail, null);
    pushLog(label, String(res.sum) + (count > 1 ? " " + detail : ""), "");
  }
  function rollCustom(expr) {
    // parse NdX(+/-M)
    var m = /^\s*(\d*)\s*d\s*(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(expr);
    if (!m) { setReadout("?", "—", "Try a form like 2d6+1", null); return; }
    var n = m[1] ? parseInt(m[1], 10) : 1;
    var sides = parseInt(m[2], 10);
    var modv = m[3] ? parseInt(m[3].replace(/\s/g, ""), 10) : 0;
    if (n < 1 || n > 100 || sides < 1 || sides > 1000) { setReadout("?", "—", "Out of range", null); return; }
    var res = rollN(n, sides);
    var tot = res.sum + modv;
    var label = n + "d" + sides + (modv ? signed(modv) : "");
    var detail = (n > 1 ? "[" + res.rolls.join(", ") + "]" : "d" + sides + " " + res.rolls[0]) + (modv ? " " + signed(modv) : "");
    setReadout(label, tot, detail, null);
    pushLog(label, String(tot), "");
  }

  function bind() {
    // HP
    document.getElementById("hpDown").onclick = function () { state.hp = Math.max(0, state.hp - 1); save(); updateHpBar(); };
    document.getElementById("hpUp").onclick = function () { state.hp = Math.min(DATA.hp, state.hp + 1); save(); updateHpBar(); };
    document.getElementById("exDown").onclick = function () { state.exhaustion = Math.max(0, state.exhaustion - 1); save(); updateHpBar(); };
    document.getElementById("exUp").onclick = function () { state.exhaustion = state.exhaustion + 1; save(); updateHpBar(); };

    // stat / action buttons
    root.querySelectorAll("[data-roll]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-roll"), key = btn.getAttribute("data-key");
        if (kind === "ability") rollAbility(key);
        else if (kind === "save") rollSave(key);
        else if (kind === "skill") rollSkill(key);
        else if (kind === "attack") rollAttack();
      });
    });

    // dice tray
    root.querySelectorAll("[data-die]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        rollPlainDie(parseInt(btn.getAttribute("data-die"), 10), parseInt(btn.getAttribute("data-count") || "1", 10));
      });
    });

    // custom roll
    var ci = document.getElementById("customInput");
    document.getElementById("customBtn").onclick = function () { rollCustom(ci.value); };
    ci.addEventListener("keydown", function (e) { if (e.key === "Enter") rollCustom(ci.value); });

    // coins
    root.querySelectorAll("[data-coin]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        state.coins[inp.getAttribute("data-coin")] = Math.max(0, parseInt(inp.value || "0", 10) || 0);
        save();
      });
    });

    // rune uses
    root.querySelectorAll("[data-rune-inc]").forEach(function (b) {
      b.onclick = function () { var i = b.getAttribute("data-rune-inc"); state.runeUses[i] = (state.runeUses[i] || 0) + 1; save(); syncRune(i); };
    });
    root.querySelectorAll("[data-rune-dec]").forEach(function (b) {
      b.onclick = function () { var i = b.getAttribute("data-rune-dec"); state.runeUses[i] = Math.max(0, (state.runeUses[i] || 0) - 1); save(); syncRune(i); };
    });
    var rr = document.getElementById("runeRest");
    if (rr) rr.onclick = function () {
      state.runeUses = {};
      state.hp = DATA.hp; state.exhaustion = 0;
      save(); render();
    };

    // log clear + reset
    document.getElementById("logClear").onclick = function () { state.log = []; save(); renderLog(); };
    document.getElementById("resetAll").onclick = function () {
      if (!confirm("Reset all trackers (HP, exhaustion, coin, rune uses, and the roll log) to their starting values?")) return;
      localStorage.removeItem(STORE_KEY);
      state = loadState();
      render();
    };
  }
  function syncRune(i) {
    var el = root.querySelector('[data-rune-val="' + i + '"]');
    if (el) el.textContent = state.runeUses[i] || 0;
  }

  render();
})();
