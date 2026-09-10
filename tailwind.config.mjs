/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      // Point at the CSS custom properties so `bg-bg-void` etc. follow the
      // active theme. Safe as bare var() because nothing uses Tailwind's
      // slash opacity modifier on these (verified: zero call sites).
      colors: {
        "bg-void":      "var(--bg-void)",
        "bg-deep":      "var(--bg-deep)",
        "bg-panel":     "var(--bg-panel)",
        "neon-magenta": "var(--neon-magenta)",
        "neon-cyan":    "var(--neon-cyan)",
        "neon-yellow":  "var(--neon-yellow)",
        "terminal-grn": "var(--terminal-grn)",
        "text-soft":    "var(--text-soft)",
        "text-muted":   "var(--text-muted)",
      },
      fontFamily: {
        pixel:    ["var(--font-display)"],
        terminal: ['"VT323"', "monospace"],
        body:     ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        scanlineDrift: {
          "0%":   { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 6px" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "47%":      { opacity: "1" },
          "48%":      { opacity: "0.4" },
          "49%":      { opacity: "1" },
          "50%":      { opacity: "0.85" },
          "51%":      { opacity: "1" },
        },
        blink: {
          "0%, 49%":   { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 8px var(--glow-color), 0 0 16px var(--glow-color)" },
          "50%":      { boxShadow: "0 0 14px var(--glow-color), 0 0 28px var(--glow-color)" },
        },
        glitchA: {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%":      { transform: "translate(-2px,1px)" },
          "40%":      { transform: "translate(1px,-1px)" },
          "60%":      { transform: "translate(-1px,2px)" },
          "80%":      { transform: "translate(2px,-1px)" },
        },
        glitchB: {
          "0%, 100%": { transform: "translate(0,0)" },
          "20%":      { transform: "translate(2px,-1px)" },
          "40%":      { transform: "translate(-1px,1px)" },
          "60%":      { transform: "translate(1px,-2px)" },
          "80%":      { transform: "translate(-2px,1px)" },
        },
      },
      animation: {
        "scanline-drift": "scanlineDrift 6s linear infinite",
        flicker:          "flicker 7s infinite steps(1)",
        blink:            "blink 1s steps(1) infinite",
        "pulse-neon":     "pulseNeon 2.4s ease-in-out infinite",
        "glitch-a":       "glitchA 1.6s infinite steps(1)",
        "glitch-b":       "glitchB 1.6s infinite steps(1)",
      },
    },
  },
  plugins: [],
};
