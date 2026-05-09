// Glitch-wipe page transition. Intercepts internal link clicks, plays a
// brief overlay animation, then navigates. On the new page, fades the
// overlay out so the wipe feels continuous across the navigation.

const KEY = "evan:in-transition";

function buildOverlay(): HTMLElement {
  let el = document.querySelector<HTMLElement>(".page-wipe");
  if (el) return el;
  el = document.createElement("div");
  el.className = "page-wipe";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <div class="page-wipe__bars"></div>
    <div class="page-wipe__rgb-r"></div>
    <div class="page-wipe__rgb-c"></div>
    <div class="page-wipe__label">
      <span class="page-wipe__bracket">[</span>
      <span class="page-wipe__text">SIGNAL HOPPING</span>
      <span class="page-wipe__cursor">▮</span>
      <span class="page-wipe__bracket">]</span>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

const overlay = buildOverlay();

// ---- Outgoing transition (link click) ----
document.addEventListener("click", (e) => {
  if (e.defaultPrevented) return;
  const a = (e.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href) return;

  // Skip: hash anchors, mailto, tel, external, blank target, downloads, modifier-clicks
  if (href === "#" || href.startsWith("#")) return;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
  if (/^(https?:)?\/\//.test(href)) {
    // External link — only intercept if same-origin
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
    } catch {
      return;
    }
  }
  if (a.target === "_blank") return;
  if (a.hasAttribute("download")) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

  e.preventDefault();
  overlay.classList.add("is-out");
  sessionStorage.setItem(KEY, "1");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = reduced ? 160 : 460;
  setTimeout(() => {
    window.location.href = a.href;
  }, dur);
});

// ---- Incoming transition (page load after navigation) ----
if (sessionStorage.getItem(KEY) === "1") {
  sessionStorage.removeItem(KEY);
  overlay.classList.add("is-out", "is-in");
  // Snap to top instantly so the wipe feels like a clean cut, not a jump
  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    setTimeout(() => {
      overlay.classList.remove("is-out");
      overlay.classList.add("is-fading");
      setTimeout(() => {
        overlay.classList.remove("is-in", "is-fading");
      }, 600);
    }, 50);
  });
}
