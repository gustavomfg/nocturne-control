export type GadgetStatus = "AVAILABLE" | "MAINTENANCE" | "DEPLOYED";

export type Gadget = {
  id: number;
  name: string;
  category: string;
  image: string;
  status: GadgetStatus;
  powerLevel: number;
  lastMaintenance: string;
  deploymentHistory: string;
  description: string;
};
