export type Page = "dashboard" | "gravemere" | "missions" | "aegis" | "terminal" | "logs" | "map" | "profile";

export type EventLog = {
  id: number;
  timestamp: string;
  type: "CAPTURE" | "DEPLOY" | "MISSION" | "SYSTEM";
  message: string;
};
