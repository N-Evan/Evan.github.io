// GitHub activity widget config.
// Set `enabled: false` to hide the section entirely (no API call is made).

export const github: {
  enabled: boolean;
  username: string;
  /** API endpoint that returns { contributions: [{date, count, level}], total: {...} } */
  endpoint: string;
} = {
  enabled: true,
  username: "N-Evan",
  endpoint: "https://github-contributions-api.jogruber.de/v4",
};
