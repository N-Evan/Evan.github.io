// Single source of truth for "available for work" status.
// Edit `current` to one of: "available", "open-to-collabs", "on-contract", "not-available".

export type AvailabilityState =
  | "available"
  | "open-to-collabs"
  | "on-contract"
  | "not-available";

export const status: {
  current: AvailabilityState;
  message?: string;
} = {
  current: "open-to-collabs",
  message: "Open to gameplay programming roles, contract work, and collaborations.",
};

export const STATE_META: Record<
  AvailabilityState,
  { label: string; color: "magenta" | "cyan" | "yellow" | "muted"; pulse: boolean }
> = {
  "available":        { label: "AVAILABLE FOR HIRE",  color: "magenta", pulse: true  },
  "open-to-collabs":  { label: "OPEN TO COLLABS",     color: "cyan",    pulse: true  },
  "on-contract":      { label: "CURRENTLY ON CONTRACT", color: "yellow", pulse: false },
  "not-available":    { label: "NOT AVAILABLE",       color: "muted",   pulse: false },
};
