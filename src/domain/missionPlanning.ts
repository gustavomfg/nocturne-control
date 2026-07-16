import type { MissionStrategy } from "../types";
import type { Gadget } from "../types/gadget.ts";
import type { Mission } from "../types/mission.ts";

const strategyEffects: Record<MissionStrategy, { progress: number; risk: number; intel: number; label: string }> = {
  STEALTH: { progress: 12, risk: -14, intel: 7, label: "Controlled / low exposure" },
  DIRECT: { progress: 20, risk: 3, intel: 2, label: "Fast / elevated exposure" },
  SURVEILLANCE: { progress: 10, risk: -9, intel: 11, label: "Intel-led / measured" },
};

export function evaluateMissionPlan(mission: Mission, strategy: MissionStrategy, gadgetIds: number[], gadgets: Gadget[]) {
  const validGadgets = gadgets.filter((gadget) => gadgetIds.includes(gadget.id) && gadget.status !== "MAINTENANCE");
  const validGadgetIds = validGadgets.map((gadget) => gadget.id);
  const gadgetPowerCosts = validGadgets.map((gadget) => ({
    gadgetId: gadget.id,
    name: gadget.name,
    powerSpent: Math.min(12, gadget.powerLevel),
  }));
  const synergy = validGadgetIds.filter((id) => mission.recommendedGadgetIds.includes(id)).length;
  const effect = strategyEffects[strategy];
  const progressGain = effect.progress + validGadgetIds.length * 2 + synergy * 3;
  const riskDelta = effect.risk - synergy * 3;

  return {
    progressGain,
    riskDelta,
    intelGain: effect.intel + synergy * 2,
    powerCost: gadgetPowerCosts.reduce((total, gadget) => total + gadget.powerSpent, 0),
    validGadgetIds,
    gadgetPowerCosts,
    synergy,
    label: effect.label,
    projectedProgress: Math.min(100, mission.progress + progressGain),
    projectedRisk: Math.max(0, Math.min(100, mission.riskLevel + riskDelta)),
  };
}
