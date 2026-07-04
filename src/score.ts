#!/usr/bin/env npx tsx
/**
 * Personalized SAP-like score model.
 * See prototype.md for the full write-up of the procedure and factors.
 */

// ---------------------------------------------------------------------------
// Weights: how the overall EPC score splits into heating / hot water / lighting
// ---------------------------------------------------------------------------

const WEIGHTS = {
  heating: 0.65,
  hotWater: 0.18,
  lighting: 0.17,
} as const;

// ---------------------------------------------------------------------------
// Factors
// ---------------------------------------------------------------------------

/** Factors that apply to heating, hot water, and lighting alike. */
interface CommonFactors {
  occupants: number;
  presence: number; // work from home / time spent at home
  floorArea: number;
}

/** Factors that only apply to the heating component. */
interface HeatingFactors {
  insulation: number;
  ventilation: number;
  fuelType: number; // gas vs. electricity
  temperaturePreference: number;
}

/** Factors that only apply to the hot water component. */
interface HotWaterFactors {
  showerFrequency: number;
  showerDuration: number;
}

/** Factors that only apply to the lighting component. */
interface LightingFactors {
  orientation: number; // N, S, E, W
  windowToWallRatio: number;
}

export interface ScoreFactors {
  common: CommonFactors;
  heating: HeatingFactors;
  hotWater: HotWaterFactors;
  lighting: LightingFactors;
}

/** All factors defaulted to 1, i.e. no adjustment from the raw EPC split. */
export const DEFAULT_FACTORS: ScoreFactors = {
  common: {
    occupants: 1,
    presence: 1,
    floorArea: 1,
  },
  heating: {
    insulation: 1,
    ventilation: 1,
    fuelType: 1,
    temperaturePreference: 1,
  },
  hotWater: {
    showerFrequency: 1,
    showerDuration: 1,
  },
  lighting: {
    orientation: 1,
    windowToWallRatio: 1,
  },
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  raw: { H: number; W: number; L: number };
  adjusted: { H: number; W: number; L: number };
  score: number;
}

function product(...factors: number[]): number {
  return factors.reduce((acc, f) => acc * f, 1);
}

/**
 * Computes a personalized SAP-like score from an accurate EPC score (1-100),
 * given a set of household-specific adjustment factors.
 */
export function computePersonalizedScore(
  epcScore: number,
  factors: ScoreFactors = DEFAULT_FACTORS,
): ScoreBreakdown {
  const { common, heating, hotWater, lighting } = factors;

  const H = WEIGHTS.heating * epcScore;
  const W = WEIGHTS.hotWater * epcScore;
  const L = WEIGHTS.lighting * epcScore;

  const commonFactor = product(common.occupants, common.presence, common.floorArea);

  const Hp =
    H *
    commonFactor *
    product(heating.insulation, heating.ventilation, heating.fuelType, heating.temperaturePreference);
  const Wp = W * commonFactor * product(hotWater.showerFrequency, hotWater.showerDuration);
  const Lp = L * commonFactor * product(lighting.orientation, lighting.windowToWallRatio);

  return {
    raw: { H, W, L },
    adjusted: { H: Hp, W: Wp, L: Lp },
    score: Hp + Wp + Lp,
  };
}