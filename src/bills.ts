#!/usr/bin/env npx tsx
/**
 * Personalized energy bill estimator.
 * See bills.md for the full write-up of the procedure and factors.
 */

// ---------------------------------------------------------------------------
// Factor inputs
// ---------------------------------------------------------------------------

export type HeatingFuelType = "electricity" | "gas";
export type OccupantCount = 1 | 2 | "3+";
export type Presence = "office" | "hybrid" | "wfh";
export type TemperaturePreference = "cool" | "average" | "warm";
export type RoomsHeated = "whole_house" | "rooms_i_use" | "one_or_two_rooms";
export type ShowerFrequency = "few" | "average" | "many";

export interface BillFactors {
  heatingFuelType: HeatingFuelType; // F1 - heating only
  occupants: OccupantCount; // F2 - heating, hot water, lighting
  presence: Presence; // F3 - heating, lighting
  temperaturePreference: TemperaturePreference; // F4 - heating only
  roomsHeated: RoomsHeated; // F5 - heating only
  showerFrequency: ShowerFrequency; // F6 - hot water only
}

// ---------------------------------------------------------------------------
// Factor lookup tables
// ---------------------------------------------------------------------------

const F1_HEATING_FUEL_TYPE: Record<HeatingFuelType, number> = {
  electricity: 2.5,
  gas: 1,
};

const F2_OCCUPANTS: Record<OccupantCount, number> = {
  1: 0.7,
  2: 1,
  "3+": 1.25,
};

const F3_PRESENCE_HEATING: Record<Presence, number> = {
  office: 0.9,
  hybrid: 1,
  wfh: 1.2,
};

const F3_PRESENCE_LIGHTING: Record<Presence, number> = {
  office: 0.9,
  hybrid: 1,
  wfh: 1.15,
};

const F4_TEMPERATURE_PREFERENCE: Record<TemperaturePreference, number> = {
  cool: 0.82,
  average: 1,
  warm: 1.15,
};

const F5_ROOMS_HEATED: Record<RoomsHeated, number> = {
  whole_house: 1,
  rooms_i_use: 0.82,
  one_or_two_rooms: 0.65,
};

const F6_SHOWER_FREQUENCY: Record<ShowerFrequency, number> = {
  few: 0.75,
  average: 1,
  many: 1.35,
};

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export interface BillInputs {
  heatingCostCurrent: number; // H
  hotWaterCostCurrent: number; // W
  lightingCostCurrent: number; // L
  factors: BillFactors;
}

export interface BillBreakdown {
  heating: number; // H'
  hotWater: number; // W'
  lighting: number; // L'
  total: number;
}

function average(...factors: number[]): number {
  return factors.reduce((sum, f) => sum + f, 0) / factors.length;
}

/**
 * Computes a personalized energy bill estimate from current heating, hot
 * water, and lighting costs, given a set of household-specific factors.
 */
export function computeBill(inputs: BillInputs): BillBreakdown {
  const { heatingCostCurrent, hotWaterCostCurrent, lightingCostCurrent, factors } = inputs;

  const heatingAvg = average(
    F1_HEATING_FUEL_TYPE[factors.heatingFuelType],
    F2_OCCUPANTS[factors.occupants],
    F3_PRESENCE_HEATING[factors.presence],
    F4_TEMPERATURE_PREFERENCE[factors.temperaturePreference],
    F5_ROOMS_HEATED[factors.roomsHeated],
  );

  const hotWaterAvg = average(F2_OCCUPANTS[factors.occupants], F6_SHOWER_FREQUENCY[factors.showerFrequency]);

  const lightingAvg = average(F2_OCCUPANTS[factors.occupants], F3_PRESENCE_LIGHTING[factors.presence]);

  const heating = heatingCostCurrent * heatingAvg;
  const hotWater = hotWaterCostCurrent * hotWaterAvg;
  const lighting = lightingCostCurrent * lightingAvg;

  return {
    heating,
    hotWater,
    lighting,
    total: heating + hotWater + lighting,
  };
}
