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
export const SCHEMA_VERSION = 3;
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
};

function createLog(type: EventLog["type"], message: string, timestamp: string): EventLog {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
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
  const hasNamedRecord = (item: unknown) => hasNumberId(item) &&
    typeof (item as { name?: unknown }).name === "string" &&
    typeof (item as { status?: unknown }).status === "string";
  const hasMissionRecord = (item: unknown) => hasNumberId(item) &&
    typeof (item as { title?: unknown }).title === "string" &&
    typeof (item as { district?: unknown }).district === "string" &&
    typeof (item as { status?: unknown }).status === "string" &&
    typeof (item as { progress?: unknown }).progress === "number" &&
    typeof (item as { riskLevel?: unknown }).riskLevel === "number" &&
    Array.isArray((item as { villainIds?: unknown }).villainIds) &&
    Array.isArray((item as { recommendedGadgetIds?: unknown }).recommendedGadgetIds);
  const hasLogRecord = (item: unknown) => hasNumberId(item) &&
    typeof (item as { timestamp?: unknown }).timestamp === "string" &&
    typeof (item as { type?: unknown }).type === "string" &&
    typeof (item as { message?: unknown }).message === "string";
  const campaign = state.campaign;

  return (
    state.schemaVersion === SCHEMA_VERSION &&
    typeof state.operatorName === "string" &&
    Array.isArray(state.villains) &&
    state.villains.length > 0 &&
    state.villains.every(hasNamedRecord) &&
    Array.isArray(state.missions) &&
    state.missions.length > 0 &&
    state.missions.every(hasMissionRecord) &&
    Array.isArray(state.gadgets) &&
    state.gadgets.length > 0 &&
    state.gadgets.every(hasNamedRecord) &&
    Array.isArray(state.logs) &&
    state.logs.length <= MAX_LOGS &&
    state.logs.every(hasLogRecord) &&
    Boolean(campaign && typeof campaign.night === "number" && typeof campaign.turn === "number" &&
      typeof campaign.intel === "number" && typeof campaign.cityStability === "number") &&
    Array.isArray(state.missionPlans) &&
    state.missionPlans.every((plan) => typeof plan.missionId === "number" && typeof plan.strategy === "string" &&
      Array.isArray(plan.gadgetIds) && typeof plan.unit === "string" && typeof plan.preparedAt === "string") &&
    Array.isArray(state.achievements)
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
        ...unlockAchievement(state, {
          id: "first-capture",
          title: "Containment Confirmed",
          description: "Capture a priority target.",
          unlockedAt: action.timestamp,
        }, action.timestamp),
        logs: prependLog(state.logs, createLog("CAPTURE", `${villain.name} captured near ${villain.lastLocation}.`, action.timestamp)),
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

      return {
        ...state,
        missions: state.missions.map((item) =>
          item.id === action.missionId
            ? { ...item, status: "COMPLETED", progress: 100, riskLevel: 0, eta: "COMPLETE" }
            : item
        ),
        ...unlockAchievement(state, {
          id: "first-resolution",
          title: "Night Resolved",
          description: "Resolve an operational mission.",
          unlockedAt: action.timestamp,
        }, action.timestamp),
        logs: prependLog(state.logs, createLog("MISSION", `${mission.title} resolved by ${mission.assignedUnit}.`, action.timestamp)),
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
      const missions = state.missions.map((mission) => {
        if (mission.status === "COMPLETED") return mission;
        const prepared = plannedIds.has(mission.id);
        const progressGain = prepared ? 14 : 4;
        const riskChange = prepared ? -10 : 7;
        const progress = Math.min(100, mission.progress + progressGain);
        const status: Mission["status"] = progress === 100 ? "COMPLETED" : "ACTIVE";
        return { ...mission, progress, riskLevel: Math.max(0, Math.min(100, mission.riskLevel + riskChange)), status, eta: progress === 100 ? "COMPLETE" : mission.eta };
      });
      const stabilityDelta = openMissions.length === 0 ? 8 : Math.round(openMissions.filter((mission) => plannedIds.has(mission.id)).length * 3 - openMissions.length * 2);
      const campaign = {
        night: state.campaign.night + (state.campaign.turn >= 3 ? 1 : 0),
        turn: state.campaign.turn >= 3 ? 1 : state.campaign.turn + 1,
        intel: Math.min(100, state.campaign.intel + 6 + plannedIds.size * 2),
        cityStability: Math.max(0, Math.min(100, state.campaign.cityStability + stabilityDelta)),
      };
      const achievement = campaign.night >= 2 ? unlockAchievement(state, {
        id: "night-two", title: "Second Watch", description: "Advance into the second operational night.", unlockedAt: action.timestamp,
      }, action.timestamp) : { achievements: state.achievements, logs: state.logs };
      return {
        ...state, missions, campaign, missionPlans: [], achievements: achievement.achievements,
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
