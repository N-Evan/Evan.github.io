/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        "bg-void":      "#07030f",
        "bg-deep":      "#11062a",
        "bg-panel":     "#1c0d3d",
        "neon-magenta": "#ff2e88",
        "neon-cyan":    "#00f0ff",
        "neon-yellow":  "#f7d046",
        "terminal-grn": "#39ff14",
        "text-soft":    "#e8dcff",
        "text-muted":   "#8a7ab5",
      },
      fontFamily: {
        pixel:    ['"Press Start 2P"', "monospace"],
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
