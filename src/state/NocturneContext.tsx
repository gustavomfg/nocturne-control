/* eslint-disable react-refresh/only-export-components -- reducer exports are intentionally testable */
import { useEffect, useReducer } from "react";
import type { ReactNode } from "react";

import { gadgets as initialGadgets } from "../data/gadgets";
import { missions as initialMissions } from "../data/missions";
import { villains as initialVillains } from "../data/villains";
import type { EventLog } from "../types";
import type { Achievement, CampaignState } from "../types";
import type { Mission } from "../types/mission";
import { notify } from "../utils/uiEvents";
import { NocturneContext } from "./nocturneContext";
import type { NocturneAction, NocturneState } from "./nocturneContext";

const STORAGE_KEY = "nocturne-control-state";
export const SCHEMA_VERSION = 4;
const MAX_LOGS = 500;

const defaultCampaign: CampaignState = { night: 1, turn: 1, intel: 24, cityStability: 58 };

export const initialState: NocturneState = {
  schemaVersion: SCHEMA_VERSION,
  operatorName: "",
  villains: initialVillains,
  missions: initialMissions,
  gadgets: initialGadgets,
  logs: [
    {
      id: 1,
      timestamp: "SYSTEM BOOT",
      type: "SYSTEM",
      message: "Nocturne Control Center initialized.",
    },
  ],
  campaign: defaultCampaign,
  missionPlans: [],
  achievements: [],
  watchReports: [],
};

function createLog(type: EventLog["type"], message: string, timestamp: string): EventLog {
  const signature = `${timestamp}:${type}:${message}`;
  const id = Array.from(signature).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
  return {
    id,
    timestamp,
    type,
    message,
  };
}

function prependLog(logs: EventLog[], log: EventLog) {
  return [log, ...logs].slice(0, MAX_LOGS);
}

function unlockAchievement(state: NocturneState, achievement: Achievement, timestamp: string): Pick<NocturneState, "achievements" | "logs"> {
  if (state.achievements.some((item) => item.id === achievement.id)) {
    return { achievements: state.achievements, logs: state.logs };
  }

  return {
    achievements: [...state.achievements, { ...achievement, unlockedAt: timestamp }],
    logs: prependLog(state.logs, createLog("ACHIEVEMENT", `Archive unlocked: ${achievement.title}.`, timestamp)),
  };
}

export function isNocturneState(value: unknown): value is NocturneState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<NocturneState>;
  const hasNumberId = (item: unknown) =>
    Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "number");
  const isFiniteRange = (value: unknown, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
  const hasNamedRecord = (item: unknown) => hasNumberId(item) &&
    typeof (item as { name?: unknown }).name === "string" &&
    typeof (item as { status?: unknown }).status === "string";
  const hasMissionRecord = (item: unknown) => hasNumberId(item) &&
    typeof (item as { title?: unknown }).title === "string" &&
    typeof (item as { district?: unknown }).district === "string" &&
    ["ACTIVE", "WAITING", "COMPLETED"].includes(String((item as { status?: unknown }).status)) &&
    ["LOW", "NORMAL", "HIGH", "CRITICAL"].includes(String((item as { priority?: unknown }).priority)) &&
    isFiniteRange((item as { progress?: unknown }).progress, 0, 100) &&
    isFiniteRange((item as { riskLevel?: unknown }).riskLevel, 0, 100) &&
    Array.isArray((item as { villainIds?: unknown }).villainIds) &&
    Array.isArray((item as { recommendedGadgetIds?: unknown }).recommendedGadgetIds);
  const hasLogRecord = (item: unknown) => hasNumberId(item) &&
    typeof (item as { timestamp?: unknown }).timestamp === "string" &&
    ["CAPTURE", "DEPLOY", "MISSION", "SYSTEM", "OPERATOR", "PLAN", "CAMPAIGN", "ACHIEVEMENT"].includes(String((item as { type?: unknown }).type)) &&
    typeof (item as { message?: unknown }).message === "string";
  const campaign = state.campaign;
  const villainIds = Array.isArray(state.villains) ? state.villains.map((item) => item.id) : [];
  const missionIds = Array.isArray(state.missions) ? state.missions.map((item) => item.id) : [];
  const gadgetIds = Array.isArray(state.gadgets) ? state.gadgets.map((item) => item.id) : [];
  const allUnique = (ids: number[]) => new Set(ids).size === ids.length;

  return (
    state.schemaVersion === SCHEMA_VERSION &&
    typeof state.operatorName === "string" &&
    Array.isArray(state.villains) &&
    state.villains.length > 0 &&
    state.villains.every(hasNamedRecord) &&
    state.villains.every((item) => ["CAPTURED", "ESCAPED", "UNKNOWN"].includes(item.status)) &&
    allUnique(villainIds) &&
    Array.isArray(state.missions) &&
    state.missions.length > 0 &&
    state.missions.every(hasMissionRecord) &&
    state.missions.every((mission) => mission.villainIds.every((id) => villainIds.includes(id)) && mission.recommendedGadgetIds.every((id) => gadgetIds.includes(id))) &&
    allUnique(missionIds) &&
    Array.isArray(state.gadgets) &&
    state.gadgets.length > 0 &&
    state.gadgets.every(hasNamedRecord) &&
    state.gadgets.every((item) => ["AVAILABLE", "MAINTENANCE", "DEPLOYED"].includes(item.status) && isFiniteRange(item.powerLevel, 0, 100)) &&
    allUnique(gadgetIds) &&
    Array.isArray(state.logs) &&
    state.logs.length <= MAX_LOGS &&
    state.logs.every(hasLogRecord) &&
    Boolean(campaign && Number.isInteger(campaign.night) && campaign.night >= 1 &&
      Number.isInteger(campaign.turn) && campaign.turn >= 1 && campaign.turn <= 3 &&
      isFiniteRange(campaign.intel, 0, 100) && isFiniteRange(campaign.cityStability, 0, 100)) &&
    Array.isArray(state.missionPlans) &&
    state.missionPlans.every((plan) => typeof plan.missionId === "number" && ["STEALTH", "DIRECT", "SURVEILLANCE"].includes(plan.strategy) &&
      missionIds.includes(plan.missionId) && Array.isArray(plan.gadgetIds) && plan.gadgetIds.every((id) => gadgetIds.includes(id)) &&
      typeof plan.unit === "string" && typeof plan.preparedAt === "string") &&
    Array.isArray(state.achievements) && state.achievements.every((achievement) =>
      ["first-plan", "first-capture", "first-resolution", "night-two"].includes(achievement.id) &&
      typeof achievement.title === "string" && typeof achievement.description === "string" && typeof achievement.unlockedAt === "string") &&
    Array.isArray(state.watchReports) && state.watchReports.length <= 20 &&
    state.watchReports.every((report) => typeof report.id === "string" && typeof report.timestamp === "string" &&
      Number.isInteger(report.night) && Number.isInteger(report.turn) && Array.isArray(report.outcomes) && Array.isArray(report.gadgetsDrained))
  );
}

export function migrateState(value: unknown): NocturneState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const state = value as Partial<NocturneState>;
  const legacyMissions = Array.isArray(state.missions) ? state.missions.map((mission) => ({
    ...mission,
    villainIds: Array.isArray((mission as { villainIds?: unknown }).villainIds) ? (mission as { villainIds: number[] }).villainIds : [],
    recommendedGadgetIds: Array.isArray((mission as { recommendedGadgetIds?: unknown }).recommendedGadgetIds)
      ? (mission as { recommendedGadgetIds: number[] }).recommendedGadgetIds : [],
  })) : state.missions;
  const migrated = {
    ...state,
    schemaVersion: SCHEMA_VERSION,
    operatorName: typeof state.operatorName === "string" ? state.operatorName : "",
    missions: legacyMissions,
    campaign: state.campaign ?? defaultCampaign,
    missionPlans: Array.isArray(state.missionPlans) ? state.missionPlans : [],
    achievements: Array.isArray(state.achievements) ? state.achievements : [],
    watchReports: Array.isArray(state.watchReports) ? state.watchReports : [],
    logs: Array.isArray(state.logs) ? state.logs.slice(0, MAX_LOGS) : state.logs,
  };

  return isNocturneState(migrated) ? migrated : null;
}

function loadState(): NocturneState {
  let savedState: string | null;

  try {
    savedState = localStorage.getItem(STORAGE_KEY);
  } catch {
    return initialState;
  }

  if (!savedState) {
    return initialState;
  }

  try {
    const parsedState: unknown = JSON.parse(savedState);

    return migrateState(parsedState) ?? initialState;
  } catch {
    return initialState;
  }
}

export function nocturneReducer(state: NocturneState, action: NocturneAction): NocturneState {
  switch (action.type) {
    case "RESTORE_STATE":
      return action.state;

    case "SET_OPERATOR_NAME": {
      const operatorName = action.name.trim().replace(/\s+/g, " ").slice(0, 32);

      if (!operatorName || operatorName === state.operatorName) {
        return state;
      }

      return {
        ...state,
        operatorName,
        logs: prependLog(state.logs, createLog("OPERATOR", `Operator identity confirmed: ${operatorName}.`, action.timestamp)),
      };
    }

    case "CAPTURE_VILLAIN": {
      const villain = state.villains.find((item) => item.id === action.villainId);

      if (!villain || villain.status === "CAPTURED") {
        return state;
      }

      const achievement = unlockAchievement(state, {
        id: "first-capture", title: "Containment Confirmed", description: "Capture a priority target.", unlockedAt: action.timestamp,
      }, action.timestamp);
      return {
        ...state,
        villains: state.villains.map((item) =>
          item.id === action.villainId ? { ...item, status: "CAPTURED" } : item
        ),
        missions: state.missions.map((mission) => {
          const isRelated = mission.villainIds.includes(villain.id);

          return isRelated && mission.status !== "COMPLETED"
            ? {
                ...mission,
                progress: Math.min(100, mission.progress + 18),
                riskLevel: Math.max(0, mission.riskLevel - 24),
              }
            : mission;
        }),
        achievements: achievement.achievements,
        logs: prependLog(achievement.logs, createLog("CAPTURE", `${villain.name} captured near ${villain.lastLocation}.`, action.timestamp)),
      };
    }

    case "DEPLOY_GADGET": {
      const gadget = state.gadgets.find((item) => item.id === action.gadgetId);

      if (!gadget || gadget.status === "MAINTENANCE") {
        return state;
      }

      const nextPowerLevel = Math.max(gadget.powerLevel - 18, 0);
      const nextStatus = nextPowerLevel === 0 ? "MAINTENANCE" : "DEPLOYED";
      const targetMission = state.missions
        .filter((mission) => mission.status !== "COMPLETED")
        .sort((a, b) => b.riskLevel - a.riskLevel)[0];

      return {
        ...state,
        gadgets: state.gadgets.map((item) =>
          item.id === action.gadgetId
            ? {
                ...item,
                powerLevel: nextPowerLevel,
                status: nextStatus,
                lastMaintenance: nextPowerLevel === 0 ? `${action.timestamp} / Auto-maintenance queued` : item.lastMaintenance,
                deploymentHistory: `Deployment authorized at ${action.timestamp}.`,
              }
            : item
        ),
        missions: state.missions.map((mission) => {
          if (!targetMission || mission.id !== targetMission.id) {
            return mission;
          }

          const progress = Math.min(100, mission.progress + 12);

          return {
            ...mission,
            progress,
            riskLevel: Math.max(0, mission.riskLevel - 8),
            status: progress === 100 ? "COMPLETED" : "ACTIVE",
            eta: progress === 100 ? "COMPLETE" : mission.eta,
          };
        }),
        logs: prependLog(state.logs, createLog(
            "DEPLOY",
            `${gadget.name} deployed${targetMission ? ` to ${targetMission.title}` : ""}. Power level now ${nextPowerLevel}%.`,
            action.timestamp
          )),
      };
    }

    case "RESOLVE_MISSION": {
      const mission = state.missions.find((item) => item.id === action.missionId);

      if (!mission || mission.status === "COMPLETED") {
        return state;
      }

      const achievement = unlockAchievement(state, {
        id: "first-resolution", title: "Night Resolved", description: "Resolve an operational mission.", unlockedAt: action.timestamp,
      }, action.timestamp);
      return {
        ...state,
        missions: state.missions.map((item) =>
          item.id === action.missionId
            ? { ...item, status: "COMPLETED", progress: 100, riskLevel: 0, eta: "COMPLETE" }
            : item
        ),
        achievements: achievement.achievements,
        logs: prependLog(achievement.logs, createLog("MISSION", `${mission.title} resolved by ${mission.assignedUnit}.`, action.timestamp)),
      };
    }

    case "PLAN_MISSION": {
      const mission = state.missions.find((item) => item.id === action.missionId);
      if (!mission || mission.status === "COMPLETED" || !action.unit.trim()) return state;

      const missionPlans = [
        ...state.missionPlans.filter((plan) => plan.missionId !== action.missionId),
        { missionId: action.missionId, strategy: action.strategy, gadgetIds: action.gadgetIds, unit: action.unit.trim().slice(0, 48), preparedAt: action.timestamp },
      ];
      const achievement = unlockAchievement(state, {
        id: "first-plan", title: "Prepared Operator", description: "Submit a tactical mission plan.", unlockedAt: action.timestamp,
      }, action.timestamp);
      return {
        ...state,
        missionPlans,
        achievements: achievement.achievements,
        logs: prependLog(achievement.logs, createLog("PLAN", `${mission.title} prepared: ${action.strategy.toLowerCase()} protocol assigned.`, action.timestamp)),
      };
    }

    case "ADVANCE_CAMPAIGN": {
      const openMissions = state.missions.filter((mission) => mission.status !== "COMPLETED");
      const plannedIds = new Set(state.missionPlans.map((plan) => plan.missionId));
      const outcomes: import("../types").MissionOutcome[] = [];
      const plansByMission = new Map(state.missionPlans.map((plan) => [plan.missionId, plan]));
      const missions = state.missions.map((mission) => {
        if (mission.status === "COMPLETED") return mission;
        const plan = plansByMission.get(mission.id);
        const strategyEffects = plan ? {
          STEALTH: { progress: 12, risk: -14 }, DIRECT: { progress: 20, risk: 3 }, SURVEILLANCE: { progress: 10, risk: -9 },
        }[plan.strategy] : { progress: 4, risk: 7 };
        const validAssets = plan?.gadgetIds.filter((id) => state.gadgets.some((gadget) => gadget.id === id && gadget.status !== "MAINTENANCE")) ?? [];
        const synergy = validAssets.filter((id) => mission.recommendedGadgetIds.includes(id)).length;
        const progressGain = strategyEffects.progress + validAssets.length * 2 + synergy * 3;
        const riskChange = strategyEffects.risk - synergy * 3;
        const progress = Math.min(100, mission.progress + progressGain);
        const status: Mission["status"] = progress === 100 ? "COMPLETED" : "ACTIVE";
        outcomes.push({ missionId: mission.id, title: mission.title, strategy: plan?.strategy ?? "UNPLANNED", progressBefore: mission.progress, progressAfter: progress, riskBefore: mission.riskLevel, riskAfter: Math.max(0, Math.min(100, mission.riskLevel + riskChange)), completed: progress === 100 });
        return { ...mission, progress, riskLevel: Math.max(0, Math.min(100, mission.riskLevel + riskChange)), status, eta: progress === 100 ? "COMPLETE" : mission.eta };
      });
      const stabilityDelta = openMissions.length === 0 ? 8 : Math.round(openMissions.filter((mission) => plannedIds.has(mission.id)).length * 3 - openMissions.length * 2);
      const intelBonus = state.missionPlans.reduce((total, plan) => {
        const mission = state.missions.find((item) => item.id === plan.missionId);
        const base = { STEALTH: 7, DIRECT: 2, SURVEILLANCE: 11 }[plan.strategy];
        const synergy = mission ? plan.gadgetIds.filter((id) => mission.recommendedGadgetIds.includes(id)).length : 0;
        return total + base + synergy * 2;
      }, 0);
      const campaign = {
        night: state.campaign.night + (state.campaign.turn >= 3 ? 1 : 0),
        turn: state.campaign.turn >= 3 ? 1 : state.campaign.turn + 1,
        intel: Math.min(100, state.campaign.intel + 4 + intelBonus),
        cityStability: Math.max(0, Math.min(100, state.campaign.cityStability + stabilityDelta)),
      };
      const achievement = campaign.night >= 2 ? unlockAchievement(state, {
        id: "night-two", title: "Second Watch", description: "Advance into the second operational night.", unlockedAt: action.timestamp,
      }, action.timestamp) : { achievements: state.achievements, logs: state.logs };
      const usedGadgetIds = new Set(state.missionPlans.flatMap((plan) => plan.gadgetIds));
      const gadgetsDrained = state.gadgets.filter((gadget) => usedGadgetIds.has(gadget.id) && gadget.status !== "MAINTENANCE").map((gadget) => ({ gadgetId: gadget.id, name: gadget.name, powerSpent: Math.min(12, gadget.powerLevel) }));
      const gadgets = state.gadgets.map((gadget) => {
        if (!usedGadgetIds.has(gadget.id) || gadget.status === "MAINTENANCE") return gadget;
        const powerLevel = Math.max(0, gadget.powerLevel - 12);
        return { ...gadget, powerLevel, status: powerLevel === 0 ? "MAINTENANCE" as const : "DEPLOYED" as const, deploymentHistory: `Assigned during watch ${state.campaign.night}.${state.campaign.turn}.` };
      });
      const report = { id: `${state.campaign.night}-${state.campaign.turn}-${action.timestamp}`, timestamp: action.timestamp, night: state.campaign.night, turn: state.campaign.turn, stabilityBefore: state.campaign.cityStability, stabilityAfter: campaign.cityStability, intelBefore: state.campaign.intel, intelAfter: campaign.intel, outcomes, gadgetsDrained };
      return {
        ...state, missions, gadgets, campaign, missionPlans: [], achievements: achievement.achievements, watchReports: [report, ...state.watchReports].slice(0, 20),
        logs: prependLog(achievement.logs, createLog("CAMPAIGN", `Watch advanced. City stability ${campaign.cityStability}%; intelligence ${campaign.intel}%.`, action.timestamp)),
      };
    }

    case "ADD_MISSION": {
      if (state.missions.some((mission) => mission.id === action.mission.id)) return state;
      return {
        ...state,
        missions: [...state.missions, action.mission],
        logs: prependLog(state.logs, createLog("SYSTEM", `Custom scenario mission added: ${action.mission.title}.`, action.timestamp)),
      };
    }

    case "RESET_STATE":
      return {
        ...initialState,
        operatorName: state.operatorName,
        logs: [createLog("SYSTEM", `Operational state reset by ${state.operatorName || "unknown operator"}.`, "SYSTEM RESET")],
      };

    default:
      return state;
  }
}

function getTimestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function NocturneProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(nocturneReducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app remains usable when browser storage is unavailable.
    }
  }, [state]);

  return (
    <NocturneContext.Provider
      value={{
        ...state,
        setOperatorName: (name) => {
          dispatch({ type: "SET_OPERATOR_NAME", name, timestamp: getTimestamp() });
          notify({ title: "Identity updated", message: `Operator profile set to ${name.trim()}.`, tone: "success" });
        },
        importState: (value) => {
          const nextState = migrateState(value);
          if (!nextState) {
            return false;
          }
          dispatch({ type: "RESTORE_STATE", state: nextState });
          notify({ title: "Save restored", message: "Operational state synchronized.", tone: "success" });
          return true;
        },
        captureVillain: (villainId) => {
          const villain = state.villains.find((item) => item.id === villainId);
          dispatch({ type: "CAPTURE_VILLAIN", villainId, timestamp: getTimestamp() });
          if (villain?.status !== "CAPTURED") notify({ title: "Target contained", message: villain?.name, tone: "success" });
        },
        deployGadget: (gadgetId) => {
          const gadget = state.gadgets.find((item) => item.id === gadgetId);
          dispatch({ type: "DEPLOY_GADGET", gadgetId, timestamp: getTimestamp() });
          if (gadget?.status !== "MAINTENANCE") notify({ title: "Asset deployed", message: `${gadget?.name} assigned to priority operation.` });
        },
        resolveMission: (missionId) => {
          const mission = state.missions.find((item) => item.id === missionId);
          dispatch({ type: "RESOLVE_MISSION", missionId, timestamp: getTimestamp() });
          if (mission?.status !== "COMPLETED") notify({ title: "Operation complete", message: mission?.title, tone: "success" });
        },
        planMission: (missionId, strategy, gadgetIds, unit) => {
          const mission = state.missions.find((item) => item.id === missionId);
          dispatch({ type: "PLAN_MISSION", missionId, strategy, gadgetIds, unit, timestamp: getTimestamp() });
          if (mission) notify({ title: "Plan committed", message: `${mission.title} is ready for the next watch.`, tone: "success" });
        },
        advanceCampaign: () => {
          dispatch({ type: "ADVANCE_CAMPAIGN", timestamp: getTimestamp() });
          notify({ title: "Watch advanced", message: "Mission consequences have been recalculated." });
        },
        addMission: (mission) => {
          if (state.missions.some((item) => item.id === mission.id)) return false;
          dispatch({ type: "ADD_MISSION", mission, timestamp: getTimestamp() });
          notify({ title: "Scenario indexed", message: mission.title, tone: "success" });
          return true;
        },
        resetState: () => dispatch({ type: "RESET_STATE" }),
      }}
    >
      {children}
    </NocturneContext.Provider>
  );
}
