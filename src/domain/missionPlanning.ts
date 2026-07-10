import type { MissionStrategy } from "../types";
import type { Gadget } from "../types/gadget";
import type { Mission } from "../types/mission";

const strategyEffects: Record<MissionStrategy, { progress: number; risk: number; intel: number; label: string }> = {
  STEALTH: { progress: 12, risk: -14, intel: 7, label: "Controlled / low exposure" },
  DIRECT: { progress: 20, risk: 3, intel: 2, label: "Fast / elevated exposure" },
  SURVEILLANCE: { progress: 10, risk: -9, intel: 11, label: "Intel-led / measured" },
};

export function forecastMission(mission: Mission, strategy: MissionStrategy, gadgetIds: number[], gadgets: Gadget[]) {
  const availableIds = gadgetIds.filter((id) => gadgets.some((gadget) => gadget.id === id && gadget.status !== "MAINTENANCE"));
  const synergy = availableIds.filter((id) => mission.recommendedGadgetIds.includes(id)).length;
  const effect = strategyEffects[strategy];
  const progressGain = effect.progress + availableIds.length * 2 + synergy * 3;
  const riskDelta = effect.risk - synergy * 3;

  return {
    progressGain,
    riskDelta,
    intelGain: effect.intel + synergy * 2,
    powerCost: availableIds.length * 12,
    synergy,
    label: effect.label,
    projectedProgress: Math.min(100, mission.progress + progressGain),
    projectedRisk: Math.max(0, Math.min(100, mission.riskLevel + riskDelta)),
  };
}
