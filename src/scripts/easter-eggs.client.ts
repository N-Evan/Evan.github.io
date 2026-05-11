// Easter eggs: Konami code, typed cheat codes, and section-based achievements.
// All payloads dispatched via the toast stack.

type ToastTone = "magenta" | "cyan" | "yellow" | "green" | "dota" | "orange";

interface ToastOpts {
  title: string;
  text?: string;
  tone?: ToastTone;
  icon?: string;
  duration?: number;
}

function showToast(opts: ToastOpts) {
  const stack = document.querySelector(".toast-stack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = `pix-toast pix-toast--${opts.tone ?? "magenta"}`;
  const icon = opts.icon ?? "▲";
  const text = opts.text ? `<div class="pix-toast__text">${opts.text}</div>` : "";
  el.innerHTML = `
    <div class="pix-toast__icon">${icon}</div>
    <div class="pix-toast__body">
      <div class="pix-toast__title">${opts.title}</div>
      ${text}
    </div>
  `;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));
  const dur = opts.duration ?? 4200;
  setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => el.remove(), 400);
  }, dur);
}

// ------------------------------------------------------------------
// Coin counter (Pacman/Mario easter eggs). Persisted in localStorage.
// Increments on cheat finds, achievements, and explicit `evan:coin` events.
// ------------------------------------------------------------------
const COIN_KEY = "evan:coins";
let coinCount = 0;
try {
  coinCount = parseInt(localStorage.getItem(COIN_KEY) ?? "0", 10) || 0;
} catch {}

function paintCoins() {
  const el = document.querySelector<HTMLElement>("[data-coin-count]");
  if (el) el.textContent = String(coinCount).padStart(3, "0");
}

function addCoins(n: number) {
  coinCount += n;
  try { localStorage.setItem(COIN_KEY, String(coinCount)); } catch {}
  paintCoins();
  const tag = document.querySelector<HTMLElement>("[data-coin-counter]");
  if (tag) {
    tag.classList.remove("is-pop");
    void tag.offsetWidth;
    tag.classList.add("is-pop");
    setTimeout(() => tag.classList.remove("is-pop"), 240);
  }
}

paintCoins();
window.addEventListener("evan:coin", (e) => {
  const detail = (e as CustomEvent).detail || {};
  const n = typeof detail.n === "number" ? detail.n : 1;
  addCoins(n);
});

// ------------------------------------------------------------------
// Konami code: ↑↑↓↓←→←→BA
// ------------------------------------------------------------------
const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];
let konamiIdx = 0;

function activateDevMode() {
  document.body.classList.toggle("dev-mode");
  const on = document.body.classList.contains("dev-mode");
  if (on) addCoins(5);
  showToast({
    title: on ? "DEV MODE :: ON" : "DEV MODE :: OFF",
    text: on
      ? "↑↑↓↓←→←→BA accepted. CRT amplitude raised."
      : "Restored to normal output.",
    tone: on ? "green" : "cyan",
    icon: on ? "✦" : "□",
    duration: 5000,
  });
}

// ------------------------------------------------------------------
// Typed cheat codes
// ------------------------------------------------------------------
const CHEATS: Record<
  string,
  { run: () => void; cooldown?: number }
> = {
  // Dota — All Chat style
  ggwp: {
    run: () =>
      showToast({
        title: "ALL CHAT",
        text: "Evan: gg wp 🤝",
        tone: "dota",
        icon: "GG",
        duration: 4500,
      }),
  },
  gg: {
    run: () =>
      showToast({
        title: "ALL CHAT",
        text: "Evan: gg",
        tone: "dota",
        icon: "GG",
        duration: 3500,
      }),
  },
  // Doom — IDDQD god mode
  iddqd: {
    run: () =>
      showToast({
        title: "GOD MODE ACTIVATED",
        text: "Degreelessness Mode On.",
        tone: "yellow",
        icon: "+",
        duration: 4500,
      }),
  },
  // StarCraft — show me the money
  showmedamoney: {
    run: () =>
      showToast({
        title: "+10000 MINERALS",
        text: "+10000 vespene gas. Spend wisely.",
        tone: "cyan",
        icon: "$$",
        duration: 4500,
      }),
  },
  // The Sims — rosebud cheat
  rosebud: {
    run: () =>
      showToast({
        title: "+1000 SIMOLEONS",
        text: "Don't forget to refill the swimming pool.",
        tone: "green",
        icon: "$",
        duration: 4500,
      }),
  },
  // Half-Life — sv_cheats wink
  noclip: {
    run: () =>
      showToast({
        title: "NOCLIP ENABLED",
        text: "You are now phasing through reality.",
        tone: "magenta",
        icon: "◇",
        duration: 4500,
      }),
  },
  // Skyrim — fus ro dah
  fusrodah: {
    run: () => {
      showToast({
        title: "FUS RO DAH",
        text: "The walls shake. (Not really.)",
        tone: "orange",
        icon: "!!",
        duration: 4500,
      });
      document.body.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-10px)" },
          { transform: "translateX(8px)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 380, easing: "linear" }
      );
    },
  },
  // Portal — the cake is a lie
  thecakeisalie: {
    run: () =>
      showToast({
        title: "OBJECTIVE FAILED",
        text: "The cake is a lie. There is no cake.",
        tone: "orange",
        icon: "??",
        duration: 5000,
      }),
  },
  // Mario — extra life
  "1up": {
    run: () =>
      showToast({
        title: "1-UP",
        text: "Extra life acquired.",
        tone: "green",
        icon: "1up",
        duration: 3500,
      }),
  },
  // Pacman — power pellet
  wakawaka: {
    run: () => {
      showToast({
        title: "POWER PELLET",
        text: "waka waka waka waka 👻",
        tone: "yellow",
        icon: "●",
        duration: 4500,
      });
      addCoins(5);
      const lane = document.querySelector<HTMLElement>(".pac-trail__lane");
      if (lane) {
        lane.classList.remove("is-running", "is-reverse");
        void lane.offsetWidth;
        lane.classList.add("is-running");
      }
    },
  },
  // Mario — invincibility
  starman: {
    run: () => {
      showToast({
        title: "STAR POWER!",
        text: "Invincibility — 8 seconds. Run wild.",
        tone: "yellow",
        icon: "★",
        duration: 5000,
      });
      document.body.classList.add("starman");
      addCoins(3);
      setTimeout(() => document.body.classList.remove("starman"), 8000);
    },
  },
  // Mario — it's-a me!
  itsame: {
    run: () => {
      showToast({
        title: "IT'S-A ME, MARIO!",
        text: "+1 coin. Bouncy.",
        tone: "magenta",
        icon: "♪",
        duration: 4500,
      });
      document.body.classList.add("mario-jump");
      addCoins(1);
      setTimeout(() => document.body.classList.remove("mario-jump"), 1300);
    },
  },
  // Pacman — open mini-game
  pacman: {
    run: () => {
      showToast({
        title: "READY!",
        text: "PAC-MAN.exe booting…",
        tone: "yellow",
        icon: "●",
        duration: 2500,
      });
      setTimeout(() => window.dispatchEvent(new CustomEvent("evan:open-pacman")), 600);
    },
  },
};

const CHEAT_KEYS = Object.keys(CHEATS).sort((a, b) => b.length - a.length);
let buffer = "";
let foundCount = 0;
const foundSet = new Set<string>();

function handleTypedKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

  if (e.key.length !== 1) return;
  buffer = (buffer + e.key.toLowerCase()).slice(-40);

  for (const phrase of CHEAT_KEYS) {
    if (buffer.endsWith(phrase)) {
      CHEATS[phrase].run();
      buffer = "";
      const wasNew = !foundSet.has(phrase);
      foundSet.add(phrase);
      if (wasNew) addCoins(1);
      if (foundSet.size === 3) {
        setTimeout(() => {
          showToast({
            title: "ACHIEVEMENT // EASTER EGG HUNTER",
            text: "Three cheats found. There are more.",
            tone: "magenta",
            icon: "★",
            duration: 5500,
          });
        }, 1200);
      }
      foundCount++;
      return;
    }
  }
}

// ------------------------------------------------------------------
// Konami listener
// ------------------------------------------------------------------
function handleKonami(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
  const expected = KONAMI[konamiIdx];
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === expected) {
    konamiIdx++;
    if (konamiIdx === KONAMI.length) {
      activateDevMode();
      konamiIdx = 0;
    }
  } else {
    konamiIdx = key === KONAMI[0] ? 1 : 0;
  }
}

window.addEventListener("keydown", handleTypedKey);
window.addEventListener("keydown", handleKonami);

// ------------------------------------------------------------------
// Section-based achievement toasts
// Trigger once per session when a section enters viewport.
// ------------------------------------------------------------------
const SESSION_KEY = "evan:achievements";
const earned: Record<string, true> = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}");
  } catch {
    return {};
  }
})();

function persistEarned() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(earned));
  } catch {}
}

const ACHIEVEMENTS: Record<
  string,
  { title: string; text: string; tone: ToastTone; icon?: string; delay?: number }
> = {
  profile: {
    title: "ACHIEVEMENT // OPERATOR PROFILED",
    text: "Reviewed the operator's dossier.",
    tone: "cyan",
    icon: "●",
    delay: 800,
  },
  missions: {
    title: "ACHIEVEMENT // MISSION LOG ACCESSED",
    text: "Six entries on file. Pick wisely.",
    tone: "magenta",
    icon: "▲",
    delay: 600,
  },
  loadout: {
    title: "ACHIEVEMENT // INVENTORY OPEN",
    text: "Loadout inspected.",
    tone: "yellow",
    icon: "⚙",
    delay: 500,
  },
  career: {
    title: "ACHIEVEMENT // HISTORY SURVEYED",
    text: "Followed the career trail.",
    tone: "cyan",
    icon: "◆",
    delay: 500,
  },
  comms: {
    title: "ACHIEVEMENT // CHANNEL OPEN",
    text: "Reached out via the comms section.",
    tone: "magenta",
    icon: "◇",
    delay: 500,
  },
};

const sectionObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = (entry.target as HTMLElement).id;
      const ach = ACHIEVEMENTS[id];
      if (!ach || earned[id]) continue;
      earned[id] = true;
      persistEarned();
      setTimeout(() => {
        showToast({ ...ach, duration: 4200 });
        addCoins(1);
      }, ach.delay ?? 0);
    }
  },
  { threshold: 0.4 }
);

Object.keys(ACHIEVEMENTS).forEach((id) => {
  const el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});

// Hint toast on first arrival (once per session)
if (!earned.__hint) {
  earned.__hint = true;
  persistEarned();
  setTimeout(() => {
    showToast({
      title: "TIP // EASTER EGGS",
      text: "Try typing classic cheat codes — or hold ↓ for 3s.",
      tone: "orange",
      icon: "?",
      duration: 5500,
    });
  }, 7500);
}

// ------------------------------------------------------------------
// Visit counter / first-time visitor welcome
// ------------------------------------------------------------------
const VISIT_KEY = "evan:visit-count";
const SESSION_VISIT_KEY = "evan:visit-counted";

let visitCount = 0;
let isFreshSession = false;
try {
  visitCount = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) || 0;
  if (!sessionStorage.getItem(SESSION_VISIT_KEY)) {
    visitCount += 1;
    localStorage.setItem(VISIT_KEY, String(visitCount));
    sessionStorage.setItem(SESSION_VISIT_KEY, "1");
    isFreshSession = true;
  }
} catch {}

// Stamp the visit count into the bottom-left HUD corner
function paintVisitCount() {
  const tlBl = document.querySelector(".hud__bl");
  if (tlBl) {
    const stamp = document.createElement("span");
    stamp.className = "hud__visit-tag";
    stamp.textContent = ` · VISIT #${String(visitCount).padStart(3, "0")}`;
    tlBl.appendChild(stamp);
  }
}
paintVisitCount();

// Welcome toast — only on fresh session entry, not on subsequent navigations.
setTimeout(() => {
  if (!isFreshSession) return;
  if (visitCount === 1) {
    showToast({
      title: "WELCOME, NEW OPERATOR",
      text: "First time logged. Make yourself at home.",
      tone: "magenta",
      icon: "★",
      duration: 5500,
    });
  } else if (visitCount > 1) {
    showToast({
      title: `WELCOME BACK · VISIT #${visitCount}`,
      text: "Thanks for stopping by again.",
      tone: "cyan",
      icon: "▲",
      duration: 4200,
    });
  }
}, 1400);

// ------------------------------------------------------------------
// Dev mode visual flair (toggled by Konami)
// ------------------------------------------------------------------
const devStyle = document.createElement("style");
devStyle.textContent = `
.dev-mode .scanlines { --scanline-opacity: 0.14 !important; }
.dev-mode .cursor-trail .ct-dot { animation: dev-rainbow 1.2s linear infinite; }
@keyframes dev-rainbow {
  0% { filter: hue-rotate(0); }
  100% { filter: hue-rotate(360deg); }
}
.dev-mode body::before {
  content: "DEV MODE";
  position: fixed;
  top: 50%; right: 1rem;
  transform: translateY(-50%) rotate(-90deg);
  transform-origin: center;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.6rem;
  color: var(--terminal-grn);
  text-shadow: 0 0 6px var(--terminal-grn);
  letter-spacing: 0.4em;
  z-index: 9995;
  pointer-events: none;
  animation: dev-flicker 7s steps(1) infinite;
}
@keyframes dev-flicker {
  0%, 100% { opacity: 1; }
  47% { opacity: 1; }
  48% { opacity: 0.4; }
  49% { opacity: 1; }
}
`;
document.head.appendChild(devStyle);
