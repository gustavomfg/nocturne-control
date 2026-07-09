import { createContext } from "react";

import type { EventLog } from "../types";
import type { Gadget } from "../types/gadget";
import type { Mission } from "../types/mission";
import type { Villain } from "../types/villain";

export type NocturneState = {
  schemaVersion: number;
  operatorName: string;
  villains: Villain[];
  missions: Mission[];
  gadgets: Gadget[];
  logs: EventLog[];
};

export type NocturneAction =
  | { type: "SET_OPERATOR_NAME"; name: string; timestamp: string }
  | { type: "RESTORE_STATE"; state: NocturneState }
  | { type: "CAPTURE_VILLAIN"; villainId: number; timestamp: string }
  | { type: "DEPLOY_GADGET"; gadgetId: number; timestamp: string }
  | { type: "RESOLVE_MISSION"; missionId: number; timestamp: string }
  | { type: "RESET_STATE" };

export type NocturneContextValue = NocturneState & {
  setOperatorName: (name: string) => void;
  importState: (value: unknown) => boolean;
  captureVillain: (villainId: number) => void;
  deployGadget: (gadgetId: number) => void;
  resolveMission: (missionId: number) => void;
  resetState: () => void;
};

export const NocturneContext = createContext<NocturneContextValue | null>(null);
