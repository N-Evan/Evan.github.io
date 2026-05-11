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
  game: "Dota 2",
  platform: "Steam · PC",
  hours: 4020,
  status: "Trying to not tilt",
  cover: undefined,
  link: undefined,
};
