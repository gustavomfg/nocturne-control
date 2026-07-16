/* eslint-disable react-refresh/only-export-components -- reducer exports are intentionally testable */
import { useEffect, useReducer } from "react";
import type { ReactNode } from "react";

import { gadgets as initialGadgets } from "../data/gadgets.ts";
import { missions as initialMissions } from "../data/missions.ts";
import { villains as initialVillains } from "../data/villains.ts";
import { evaluateMissionPlan } from "../domain/missionPlanning.ts";
import type { EventLog } from "../types";
import type { Achievement, CampaignState } from "../types";
import type { Mission } from "../types/mission.ts";
import { notify } from "../utils/uiEvents.ts";
import { NocturneContext } from "./nocturneContext.ts";
import type { NocturneAction, NocturneState } from "./nocturneContext.ts";

const STORAGE_KEY = "nocturne-control-state";
export const SCHEMA_VERSION = 4;
const MAX_LOGS = 500;
const MAX_VILLAINS = 500;
const MAX_MISSIONS = 1_000;
const MAX_GADGETS = 500;
const MAX_WATCH_REPORTS = 20;
const MAX_SHORT_TEXT = 200;
const MAX_LONG_TEXT = 5_000;
const MAX_ASSOCIATES = 100;
const MAX_CAMPAIGN_NIGHT = 1_000_000;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= maxLength && (allowEmpty || value.trim().length > 0);
}

function isInteger(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isFiniteRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isOneOf(value: unknown, choices: readonly string[]): value is string {
  return typeof value === "string" && choices.includes(value);
}

function isUnique(values: readonly unknown[]) {
  return new Set(values).size === values.length;
}

function isTextArray(value: unknown, maxItems: number) {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => isText(item, MAX_SHORT_TEXT));
}

function isReferenceArray(value: unknown, availableIds: Set<number>, maxItems: number) {
  return Array.isArray(value) && value.length <= maxItems && isUnique(value) &&
    value.every((id) => isInteger(id, 1) && availableIds.has(id));
}

export function isNocturneState(value: unknown): value is NocturneState {
  if (!isRecord(value)) return false;

  const villains = value.villains;
  const missions = value.missions;
  const gadgets = value.gadgets;
  const logs = value.logs;
  const campaign = value.campaign;
  const missionPlans = value.missionPlans;
  const achievements = value.achievements;
  const watchReports = value.watchReports;

  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    !isText(value.operatorName, 32, true) ||
    !Array.isArray(villains) || villains.length === 0 || villains.length > MAX_VILLAINS ||
    !Array.isArray(missions) || missions.length === 0 || missions.length > MAX_MISSIONS ||
    !Array.isArray(gadgets) || gadgets.length === 0 || gadgets.length > MAX_GADGETS ||
    !Array.isArray(logs) || logs.length > MAX_LOGS ||
    !Array.isArray(missionPlans) || missionPlans.length > missions.length ||
    !Array.isArray(achievements) || achievements.length > 4 ||
    !Array.isArray(watchReports) || watchReports.length > MAX_WATCH_REPORTS ||
    !isRecord(campaign)
  ) return false;

  const villainIds = villains.map((item) => isRecord(item) ? item.id : undefined);
  const missionIds = missions.map((item) => isRecord(item) ? item.id : undefined);
  const gadgetIds = gadgets.map((item) => isRecord(item) ? item.id : undefined);
  if (
    !villainIds.every((id) => isInteger(id, 1)) || !isUnique(villainIds) ||
    !missionIds.every((id) => isInteger(id, 1)) || !isUnique(missionIds) ||
    !gadgetIds.every((id) => isInteger(id, 1)) || !isUnique(gadgetIds)
  ) return false;

  const availableVillainIds = new Set(villainIds as number[]);
  const availableMissionIds = new Set(missionIds as number[]);
  const availableGadgetIds = new Set(gadgetIds as number[]);
  const validVillains = villains.every((item) => isRecord(item) &&
    isInteger(item.id, 1) &&
    isText(item.name, MAX_SHORT_TEXT) &&
    isText(item.alias, MAX_SHORT_TEXT) &&
    isOneOf(item.dangerLevel, ["LOW", "MEDIUM", "HIGH", "EXTREME"]) &&
    isOneOf(item.status, ["CAPTURED", "ESCAPED", "UNKNOWN"]) &&
    isText(item.lastLocation, MAX_SHORT_TEXT) &&
    isText(item.firstSeen, MAX_SHORT_TEXT) &&
    isTextArray(item.knownAssociates, MAX_ASSOCIATES) &&
    isText(item.threatNotes, MAX_LONG_TEXT) &&
    isText(item.description, MAX_LONG_TEXT));
  const validGadgets = gadgets.every((item) => isRecord(item) &&
    isInteger(item.id, 1) &&
    isText(item.name, MAX_SHORT_TEXT) &&
    isText(item.category, MAX_SHORT_TEXT) &&
    isOneOf(item.status, ["AVAILABLE", "MAINTENANCE", "DEPLOYED"]) &&
    isFiniteRange(item.powerLevel, 0, 100) &&
    isText(item.lastMaintenance, MAX_SHORT_TEXT) &&
    isText(item.deploymentHistory, MAX_LONG_TEXT) &&
    isText(item.description, MAX_LONG_TEXT));
  const validMissions = missions.every((item) => isRecord(item) &&
    isInteger(item.id, 1) &&
    isText(item.title, MAX_SHORT_TEXT) &&
    isText(item.district, MAX_SHORT_TEXT) &&
    isOneOf(item.priority, ["LOW", "NORMAL", "HIGH", "CRITICAL"]) &&
    isOneOf(item.status, ["ACTIVE", "WAITING", "COMPLETED"]) &&
    isFiniteRange(item.progress, 0, 100) &&
    isText(item.assignedUnit, MAX_SHORT_TEXT) &&
    isText(item.eta, MAX_SHORT_TEXT) &&
    isFiniteRange(item.riskLevel, 0, 100) &&
    isText(item.description, MAX_LONG_TEXT) &&
    isReferenceArray(item.villainIds, availableVillainIds, villains.length) &&
    isReferenceArray(item.recommendedGadgetIds, availableGadgetIds, gadgets.length));
  const validLogs = logs.every((item) => isRecord(item) &&
    isInteger(item.id, 0) &&
    isText(item.timestamp, MAX_SHORT_TEXT) &&
    isOneOf(item.type, ["CAPTURE", "DEPLOY", "MISSION", "SYSTEM", "OPERATOR", "PLAN", "CAMPAIGN", "ACHIEVEMENT"]) &&
    isText(item.message, MAX_LONG_TEXT));
  const validCampaign = isInteger(campaign.night, 1, MAX_CAMPAIGN_NIGHT) &&
    isInteger(campaign.turn, 1, 3) &&
    isFiniteRange(campaign.intel, 0, 100) &&
    isFiniteRange(campaign.cityStability, 0, 100);
  const validPlans = missionPlans.every((item) => isRecord(item) &&
    isInteger(item.missionId, 1) && availableMissionIds.has(item.missionId) &&
    isOneOf(item.strategy, ["STEALTH", "DIRECT", "SURVEILLANCE"]) &&
    isReferenceArray(item.gadgetIds, availableGadgetIds, gadgets.length) &&
    isText(item.unit, 48) &&
    isText(item.preparedAt, MAX_SHORT_TEXT)) &&
    isUnique(missionPlans.map((item) => isRecord(item) ? item.missionId : undefined)) &&
    isUnique(missionPlans.flatMap((item) => isRecord(item) && Array.isArray(item.gadgetIds) ? item.gadgetIds : []));
  const validAchievements = achievements.every((item) => isRecord(item) &&
    isOneOf(item.id, ["first-plan", "first-capture", "first-resolution", "night-two"]) &&
    isText(item.title, MAX_SHORT_TEXT) &&
    isText(item.description, MAX_LONG_TEXT) &&
    isText(item.unlockedAt, MAX_SHORT_TEXT)) &&
    isUnique(achievements.map((item) => isRecord(item) ? item.id : undefined));
  const validReports = watchReports.every((report) => isRecord(report) &&
    isText(report.id, MAX_SHORT_TEXT) &&
    isText(report.timestamp, MAX_SHORT_TEXT) &&
    isInteger(report.night, 1, MAX_CAMPAIGN_NIGHT) &&
    isInteger(report.turn, 1, 3) &&
    isFiniteRange(report.stabilityBefore, 0, 100) &&
    isFiniteRange(report.stabilityAfter, 0, 100) &&
    isFiniteRange(report.intelBefore, 0, 100) &&
    isFiniteRange(report.intelAfter, 0, 100) &&
    Array.isArray(report.outcomes) && report.outcomes.length <= missions.length &&
    isUnique(report.outcomes.map((item) => isRecord(item) ? item.missionId : undefined)) &&
    report.outcomes.every((outcome) => isRecord(outcome) &&
      isInteger(outcome.missionId, 1) && availableMissionIds.has(outcome.missionId) &&
      isText(outcome.title, MAX_SHORT_TEXT) &&
      isOneOf(outcome.strategy, ["STEALTH", "DIRECT", "SURVEILLANCE", "UNPLANNED"]) &&
      isFiniteRange(outcome.progressBefore, 0, 100) &&
      isFiniteRange(outcome.progressAfter, 0, 100) &&
      isFiniteRange(outcome.riskBefore, 0, 100) &&
      isFiniteRange(outcome.riskAfter, 0, 100) &&
      typeof outcome.completed === "boolean") &&
    Array.isArray(report.gadgetsDrained) && report.gadgetsDrained.length <= gadgets.length &&
    isUnique(report.gadgetsDrained.map((item) => isRecord(item) ? item.gadgetId : undefined)) &&
    report.gadgetsDrained.every((drain) => isRecord(drain) &&
      isInteger(drain.gadgetId, 1) && availableGadgetIds.has(drain.gadgetId) &&
      isText(drain.name, MAX_SHORT_TEXT) &&
      isFiniteRange(drain.powerSpent, 0, 100))) &&
    isUnique(watchReports.map((item) => isRecord(item) ? item.id : undefined));

  return validVillains && validMissions && validGadgets && validLogs && validCampaign &&
    validPlans && validAchievements && validReports;
}

export function createSaveState(state: NocturneState): NocturneState {
  return {
    schemaVersion: state.schemaVersion,
    operatorName: state.operatorName,
    villains: state.villains,
    missions: state.missions,
    gadgets: state.gadgets,
    logs: state.logs,
    campaign: state.campaign,
    missionPlans: state.missionPlans,
    achievements: state.achievements,
    watchReports: state.watchReports,
  };
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
      const reservedGadgetIds = new Set(state.missionPlans
        .filter((plan) => plan.missionId !== action.missionId)
        .flatMap((plan) => plan.gadgetIds));
      if (!isUnique(action.gadgetIds) || action.gadgetIds.some((id) => reservedGadgetIds.has(id))) return state;

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
      const evaluationsByMission = new Map(state.missionPlans.flatMap((plan) => {
        const mission = state.missions.find((item) => item.id === plan.missionId);
        return mission ? [[plan.missionId, evaluateMissionPlan(mission, plan.strategy, plan.gadgetIds, state.gadgets)] as const] : [];
      }));
      const missions = state.missions.map((mission) => {
        if (mission.status === "COMPLETED") return mission;
        const plan = plansByMission.get(mission.id);
        const evaluation = evaluationsByMission.get(mission.id);
        const progress = evaluation?.projectedProgress ?? Math.min(100, mission.progress + 4);
        const riskAfter = evaluation?.projectedRisk ?? Math.max(0, Math.min(100, mission.riskLevel + 7));
        const status: Mission["status"] = progress === 100 ? "COMPLETED" : "ACTIVE";
        outcomes.push({ missionId: mission.id, title: mission.title, strategy: plan?.strategy ?? "UNPLANNED", progressBefore: mission.progress, progressAfter: progress, riskBefore: mission.riskLevel, riskAfter, completed: progress === 100 });
        return { ...mission, progress, riskLevel: riskAfter, status, eta: progress === 100 ? "COMPLETE" : mission.eta };
      });
      const stabilityDelta = openMissions.length === 0 ? 8 : Math.round(openMissions.filter((mission) => plannedIds.has(mission.id)).length * 3 - openMissions.length * 2);
      const intelBonus = [...evaluationsByMission.values()].reduce((total, evaluation) => total + evaluation.intelGain, 0);
      const campaign = {
        night: state.campaign.night + (state.campaign.turn >= 3 ? 1 : 0),
        turn: state.campaign.turn >= 3 ? 1 : state.campaign.turn + 1,
        intel: Math.min(100, state.campaign.intel + 4 + intelBonus),
        cityStability: Math.max(0, Math.min(100, state.campaign.cityStability + stabilityDelta)),
      };
      const achievement = campaign.night >= 2 ? unlockAchievement(state, {
        id: "night-two", title: "Second Watch", description: "Advance into the second operational night.", unlockedAt: action.timestamp,
      }, action.timestamp) : { achievements: state.achievements, logs: state.logs };
      const gadgetPowerCosts = new Map([...evaluationsByMission.values()].flatMap((evaluation) =>
        evaluation.gadgetPowerCosts.map((gadget) => [gadget.gadgetId, gadget.powerSpent] as const)
      ));
      const gadgetsDrained = state.gadgets.flatMap((gadget) => {
        const powerSpent = gadgetPowerCosts.get(gadget.id);
        return powerSpent === undefined ? [] : [{ gadgetId: gadget.id, name: gadget.name, powerSpent }];
      });
      const gadgets = state.gadgets.map((gadget) => {
        const powerSpent = gadgetPowerCosts.get(gadget.id);
        if (powerSpent === undefined) return gadget;
        const powerLevel = gadget.powerLevel - powerSpent;
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
