// Global client-side bootstrapping: smooth scroll, reveal-on-scroll observer,
// anchor link interception. Imported once via BaseLayout.

import Lenis from "lenis";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({
    duration: 1.35,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });
  const raf = (time: number) => {
    lenis!.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// Intercept in-page anchor clicks for smooth scroll (and to avoid hash jumps).
document.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement | null)?.closest('a[href^="#"]') as HTMLAnchorElement | null;
  if (!target) return;
  const href = target.getAttribute("href");
  if (!href || href === "#" || href.length < 2) return;
  const el = document.querySelector(href);
  if (!el) return;
  e.preventDefault();
  if (lenis) {
    lenis.scrollTo(el as HTMLElement, { offset: -24, duration: 1.4 });
  } else {
    (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
  }
  history.replaceState(null, "", href);
});

// Reveal-on-scroll IntersectionObserver
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
);

const observeReveals = () => {
  document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => observer.observe(el));
};
observeReveals();

// Re-observe if dynamic content is added later
const mo = new MutationObserver(observeReveals);
mo.observe(document.body, { childList: true, subtree: true });

// 3D tilt for any [data-tilt] element
function setupTilt() {
  const tiltEls = document.querySelectorAll<HTMLElement>("[data-tilt]:not([data-tilt-bound])");
  tiltEls.forEach((el) => {
    el.setAttribute("data-tilt-bound", "1");
    let raf = 0;
    let targetX = 0, targetY = 0;
    let currX = 0, currY = 0;
    const lerp = () => {
      currX += (targetX - currX) * 0.15;
      currY += (targetY - currY) * 0.15;
      el.style.transform = `perspective(800px) rotateX(${currY}deg) rotateY(${currX}deg) translateZ(0)`;
      raf = requestAnimationFrame(lerp);
    };
    el.addEventListener("mouseenter", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(lerp);
    });
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = px * 10;
      targetY = -py * 8;
    });
    el.addEventListener("mouseleave", () => {
      targetX = 0; targetY = 0;
      setTimeout(() => {
        cancelAnimationFrame(raf);
        el.style.transform = "";
      }, 300);
    });
  });
}
setupTilt();
const tiltMo = new MutationObserver(setupTilt);
tiltMo.observe(document.body, { childList: true, subtree: true });

// Parallax: translate [data-parallax-speed] elements based on their parent
// section's offset from the viewport center. Higher speed = moves more.
const parallaxEls = () =>
  document.querySelectorAll<HTMLElement>("[data-parallax-speed]");

let parallaxTicking = false;
function applyParallax() {
  parallaxTicking = false;
  const vh = window.innerHeight;
  parallaxEls().forEach((el) => {
    const parent = el.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
    const speed = parseFloat(el.dataset.parallaxSpeed ?? "0.1");
    const shift = -progress * speed * 320;
    el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
  });
}
function onScrollParallax() {
  if (parallaxTicking) return;
  parallaxTicking = true;
  requestAnimationFrame(applyParallax);
}
applyParallax();
window.addEventListener("scroll", onScrollParallax, { passive: true });
window.addEventListener("resize", onScrollParallax);
