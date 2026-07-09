export type Page = "dashboard" | "gravemere" | "missions" | "aegis" | "terminal" | "logs" | "map" | "profile" | "campaign" | "editor";

export type EventLog = {
  id: number;
  timestamp: string;
  type: "CAPTURE" | "DEPLOY" | "MISSION" | "SYSTEM" | "OPERATOR" | "PLAN" | "CAMPAIGN" | "ACHIEVEMENT";
  message: string;
};

export type MissionStrategy = "STEALTH" | "DIRECT" | "SURVEILLANCE";

export type MissionPlan = {
  missionId: number;
  strategy: MissionStrategy;
  gadgetIds: number[];
  unit: string;
  preparedAt: string;
};

export type CampaignState = {
  night: number;
  turn: number;
  intel: number;
  cityStability: number;
};

export type Achievement = {
  id: "first-plan" | "first-capture" | "first-resolution" | "night-two";
  title: string;
  description: string;
  unlockedAt: string;
};
