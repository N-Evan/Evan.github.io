// Theme resolution. Kept DOM-free so it can be unit-tested, and mirrored
// byte-for-byte by the inline <script> in BaseLayout that runs before paint.

export type Theme = "dark" | "light";

export const THEME_KEY = "evan:theme";

/** Dark is the default: an unset, corrupt, or unknown stored value means dark. */
export function resolveTheme(stored: string | null | undefined): Theme {
  return stored === "light" ? "light" : "dark";
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/** Browser chrome colour, so the phone status bar doesn't stay black on bone. */
export function themeColor(theme: Theme): string {
  return theme === "light" ? "#ece6d8" : "#07030f";
}

/** Applies a theme to a document root. Returns the theme for chaining. */
export function applyTheme(root: HTMLElement, theme: Theme): Theme {
  if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  return theme;
}

export function readStoredTheme(): Theme {
  try {
    return resolveTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "dark";
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode — the theme just won't persist */
  }
}
