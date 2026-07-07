export type MissionPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type MissionStatus = "ACTIVE" | "WAITING" | "COMPLETED";

export type Mission = {
  id: number;
  title: string;
  district: string;
  image: string;
  priority: MissionPriority;
  status: MissionStatus;
  progress: number;
  assignedUnit: string;
  eta: string;
  riskLevel: number;
  description: string;
};
