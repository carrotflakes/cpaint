import { BlendMode } from "@/model/blendMode";

export const BLEND_MODES: readonly [BlendMode, string][] = [
  ["source-over", "Normal"],
  ["multiply", "Multiply"],
  ["screen", "Screen"],
  ["overlay", "Overlay"],
  ["darken", "Darken"],
  ["lighten", "Lighten"],
  ["color-dodge", "Color Dodge"],
  ["color-burn", "Color Burn"],
  ["hard-light", "Hard Light"],
  ["soft-light", "Soft Light"],
  ["difference", "Difference"],
  ["exclusion", "Exclusion"],
  ["hue", "Hue"],
  ["saturation", "Saturation"],
  ["color", "Color"],
  ["luminosity", "Luminosity"],
  ["xor", "XOR"],
] as const;
