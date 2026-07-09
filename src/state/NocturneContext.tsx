/* eslint-disable react-refresh/only-export-components -- reducer exports are intentionally testable */
import { useEffect, useReducer } from "react";
import type { ReactNode } from "react";

import { gadgets as initialGadgets } from "../data/gadgets";
import { missions as initialMissions } from "../data/missions";
import { villains as initialVillains } from "../data/villains";
import type { EventLog } from "../types";
import { notify } from "../utils/uiEvents";
import { NocturneContext } from "./nocturneContext";
import type { NocturneAction, NocturneState } from "./nocturneContext";

const STORAGE_KEY = "nocturne-control-state";
export const SCHEMA_VERSION = 2;

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
};

function createLog(type: EventLog["type"], message: string, timestamp: string): EventLog {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    timestamp,
    type,
    message,
  };
}

export function isNocturneState(value: unknown): value is NocturneState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<NocturneState>;
  const hasNumberId = (item: unknown) =>
    Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "number");
  const hasNamedRecord = (item: unknown) =>
    hasNumberId(item) && typeof (item as { name?: unknown }).name === "string";
  const hasMissionRecord = (item: unknown) =>
    hasNumberId(item) && typeof (item as { title?: unknown }).title === "string";
  const hasLogRecord = (item: unknown) =>
    hasNumberId(item) && typeof (item as { message?: unknown }).message === "string";

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
    state.logs.every(hasLogRecord)
  );
}

export function migrateState(value: unknown): NocturneState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const state = value as Partial<NocturneState>;
  const migrated = {
    ...state,
    schemaVersion: SCHEMA_VERSION,
    operatorName: typeof state.operatorName === "string" ? state.operatorName : "",
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
        logs: [
          createLog("OPERATOR", `Operator identity confirmed: ${operatorName}.`, action.timestamp),
          ...state.logs,
        ],
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
          const isRelated = mission.description.toLowerCase().includes(villain.name.toLowerCase()) ||
            mission.title.toLowerCase().includes(villain.name.toLowerCase());

          return isRelated && mission.status !== "COMPLETED"
            ? {
                ...mission,
                progress: Math.min(100, mission.progress + 18),
                riskLevel: Math.max(0, mission.riskLevel - 24),
              }
            : mission;
        }),
        logs: [
          createLog("CAPTURE", `${villain.name} captured near ${villain.lastLocation}.`, action.timestamp),
          ...state.logs,
        ],
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
        logs: [
          createLog(
            "DEPLOY",
            `${gadget.name} deployed${targetMission ? ` to ${targetMission.title}` : ""}. Power level now ${nextPowerLevel}%.`,
            action.timestamp
          ),
          ...state.logs,
        ],
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
        logs: [
          createLog("MISSION", `${mission.title} resolved by ${mission.assignedUnit}.`, action.timestamp),
          ...state.logs,
        ],
      };
    }

    case "RESET_STATE":
      return {
        ...initialState,
        operatorName: state.operatorName,
        logs: [
          createLog("SYSTEM", `Operational state reset by ${state.operatorName || "unknown operator"}.`, "SYSTEM RESET"),
        ],
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
        resetState: () => dispatch({ type: "RESET_STATE" }),
      }}
    >
      {children}
    </NocturneContext.Provider>
  );
}
