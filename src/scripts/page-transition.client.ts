// Glitch-wipe page transition.
// Outgoing: intercept internal link clicks → play overlay animation → navigate.
// Incoming: server-rendered overlay + inline head script keep things covered
// from first paint; this script just plays the fade-out so the wipe feels
// continuous across the navigation.

const KEY = "evan:in-transition";
const overlay = document.querySelector<HTMLElement>(".page-wipe");

// ---- Incoming transition (run as early as possible) ----
function handleIncoming() {
  const incoming = document.documentElement.classList.contains("is-page-incoming");
  if (!incoming || !overlay) return;
  try { sessionStorage.removeItem(KEY); } catch {}
  // Ensure scroll is at top so the wipe feels like a fresh cut, not a jump.
  window.scrollTo(0, 0);

  // Play fade-out, then unhide body content
  requestAnimationFrame(() => {
    overlay.classList.add("is-fading");
    setTimeout(() => {
      document.documentElement.classList.remove("is-page-incoming");
      overlay.classList.remove("is-fading");
    }, 620);
  });
}
handleIncoming();

// ---- Outgoing transition ----
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || !overlay) return;
  const a = (e.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href) return;

  if (href === "#" || href.startsWith("#")) return;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
  if (/^(https?:)?\/\//.test(href)) {
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
  try { sessionStorage.setItem(KEY, "1"); } catch {}

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = reduced ? 160 : 460;
  setTimeout(() => {
    window.location.href = a.href;
  }, dur);
});
