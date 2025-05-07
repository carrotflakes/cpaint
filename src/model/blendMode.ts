export const ALL_BLEND_MODES = [
  "color", "color-burn", "color-dodge", "copy", "darken", "destination-atop", "destination-in", "destination-out", "destination-over", "difference", "exclusion", "hard-light", "hue", "lighten", "lighter", "luminosity", "multiply", "overlay", "saturation", "screen", "soft-light", "source-atop", "source-in", "source-out", "source-over", "xor"] as const;

export type BlendMode = typeof ALL_BLEND_MODES[number];
