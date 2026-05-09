// "Currently Playing" widget config. Update freely.
// Set `enabled: false` to hide the widget entirely.

export const nowPlaying: {
  enabled: boolean;
  game: string;
  platform: string;
  hours?: number;
  status?: string;
  cover?: string;
  link?: string;
} = {
  enabled: true,
  game: "Hades II",
  platform: "Steam · PC",
  hours: 42,
  status: "Hunting for a Crystal Beam build.",
  cover: undefined,
  link: undefined,
};
