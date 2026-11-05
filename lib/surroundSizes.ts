/**
 * Surround sizes: every plate size REG KING makes (the plate builder's list), each with its own surround.
 * Older saved surrounds used "standard", "18", "16" and "14"; they're read as the matching plate sizes.
 */
import { ALL_SIZES, type SizeOption } from "./builder";

const LEGACY: Record<string, string> = { standard: "Normal", "18": '18"', "16": '16"', "14": '14"' };
export const SURROUND_GROUPS = ["Standard", "Hex", "Van & SUV", "Imports", "Bike"] as const;

/** Every size once (show and legal imports together), in the builder's order. */
export const SURROUND_SIZE_LIST: SizeOption[] = ALL_SIZES.filter((s, i, a) => a.findIndex((x) => x.key === s.key) === i);

export function surroundSize(key: string | null | undefined): SizeOption {
  const k = key ? LEGACY[key] ?? key : "Normal";
  return SURROUND_SIZE_LIST.find((s) => s.key === k) ?? SURROUND_SIZE_LIST[0];
}
/** Bike plates are two-line. */
export const isBikeSize = (s: SizeOption) => s.group === "Bike";
export const sizeShortName = (s: SizeOption) => s.label.replace(/ \(.*\)$/, "");
