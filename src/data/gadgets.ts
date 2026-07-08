import type { Gadget } from "../types/gadget";

export const gadgets: Gadget[] = [
  {
    id: 1,
    name: "Night Rover",
    category: "Vehicle",
    status: "AVAILABLE",
    powerLevel: 96,
    lastMaintenance: "02:10 / Aegis Garage",
    deploymentHistory: "Last deployed during Cinder Row pursuit.",
    description: "Armored tactical vehicle designed for high-speed pursuit.",
  },
  {
    id: 2,
    name: "Obsidian Mantle",
    category: "Armor",
    status: "DEPLOYED",
    powerLevel: 88,
    lastMaintenance: "18:45 / Armor bay",
    deploymentHistory: "Currently synced with field telemetry.",
    description: "Advanced combat armor with reinforced protection systems.",
  },
  {
    id: 3,
    name: "Linecaster",
    category: "Mobility",
    status: "AVAILABLE",
    powerLevel: 74,
    lastMaintenance: "16:20 / Mobility rack",
    deploymentHistory: "Used for rooftop traversal near Lantern Ward.",
    description: "Compact launcher used for vertical movement across Nocturne.",
  },
  {
    id: 4,
    name: "Veil Charge",
    category: "Stealth",
    status: "MAINTENANCE",
    powerLevel: 42,
    lastMaintenance: "Pending refill / Stealth lab",
    deploymentHistory: "Low inventory after Gravemere perimeter breach.",
    description: "Tactical concealment device for escape and distraction.",
  },
];
