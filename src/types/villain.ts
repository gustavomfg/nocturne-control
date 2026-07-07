export type DangerLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export type VillainStatus = "CAPTURED" | "ESCAPED" | "UNKNOWN";

export type Villain = {
  id: number;
  name: string;
  alias: string;
  image: string;
  dangerLevel: DangerLevel;
  status: VillainStatus;
  lastLocation: string;
  firstSeen: string;
  knownAssociates: string[];
  threatNotes: string;
  description: string;
};
