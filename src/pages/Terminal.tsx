import { useState } from "react";

import { gadgets } from "../data/gadgets";
import { missions } from "../data/missions";
import { villains } from "../data/villains";
import type { TerminalLine } from "../types/terminal";

import "../styles/terminal.css";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function findByName<T extends { name?: string; title?: string }>(items: T[], query: string) {
  const normalizedQuery = normalize(query);

  return items.find((item) => normalize(item.name ?? item.title ?? "").includes(normalizedQuery));
}

export function Terminal() {
  const [command, setCommand] = useState("");

  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: 1,
      text: "WayneTech Batcomputer v1.7 initialized.",
      type: "response",
    },
    {
      id: 2,
      text: "Type 'help' to inspect Gotham Control commands.",
      type: "response",
    },
  ]);

  function getResponse(input: string) {
    const normalizedCommand = normalize(input);

    if (normalizedCommand === "help") {
      return "Commands: status city | list villains | list missions | list gadgets | open <name> | deploy <gadget> | scan arkham | signal on | clear";
    }

    if (normalizedCommand === "status city") {
      const escapedVillains = villains.filter((villain) => villain.status === "ESCAPED").length;
      const activeMissions = missions.filter((mission) => mission.status === "ACTIVE").length;

      return `City status: DANGER. ${escapedVillains} escaped targets, ${activeMissions} active missions, ${gadgets.length} WayneTech assets indexed.`;
    }

    if (normalizedCommand === "list villains") {
      return villains.map((villain) => `${villain.name}: ${villain.status} / ${villain.dangerLevel}`).join(" | ");
    }

    if (normalizedCommand === "list missions") {
      return missions.map((mission) => `${mission.title}: ${mission.status} / risk ${mission.riskLevel}%`).join(" | ");
    }

    if (normalizedCommand === "list gadgets") {
      return gadgets.map((gadget) => `${gadget.name}: ${gadget.status} / power ${gadget.powerLevel}%`).join(" | ");
    }

    if (normalizedCommand === "scan arkham") {
      const arkhamTargets = villains.filter((villain) => villain.lastLocation.toLowerCase().includes("arkham"));

      return `Arkham scan complete: ${arkhamTargets.length} target signal(s). ${arkhamTargets.map((target) => target.name).join(", ") || "No direct lock."}`;
    }

    if (normalizedCommand === "signal on") {
      return "Bat-Signal protocol online. Rooftop relay visibility degraded by rain, but beam lock is stable.";
    }

    if (normalizedCommand.startsWith("open ")) {
      const query = input.slice(5);
      const villain = findByName(villains, query);
      const mission = findByName(missions, query);
      const gadget = findByName(gadgets, query);

      if (villain) {
        return `${villain.name}: ${villain.status}. Last location: ${villain.lastLocation}. Notes: ${villain.threatNotes}`;
      }

      if (mission) {
        return `${mission.title}: ${mission.status}. Unit: ${mission.assignedUnit}. ETA ${mission.eta}. Risk ${mission.riskLevel}%.`;
      }

      if (gadget) {
        return `${gadget.name}: ${gadget.status}. Power ${gadget.powerLevel}%. ${gadget.deploymentHistory}`;
      }

      return "File not found. Try 'list villains', 'list missions' or 'list gadgets'.";
    }

    if (normalizedCommand.startsWith("deploy ")) {
      const gadget = findByName(gadgets, input.slice(7));

      if (!gadget) {
        return "Deployment failed. WayneTech asset not found.";
      }

      if (gadget.status === "MAINTENANCE") {
        return `${gadget.name} unavailable. Maintenance lock active: ${gadget.lastMaintenance}.`;
      }

      return `${gadget.name} deployment request queued. Current power level ${gadget.powerLevel}%.`;
    }

    return "Unknown command. Type 'help'.";
  }

  function executeCommand() {
    if (!command.trim()) {
      return;
    }

    if (normalize(command) === "clear") {
      setHistory([]);
      setCommand("");
      return;
    }

    const timestamp = Date.now();
    const response = getResponse(command);

    setHistory((currentHistory) => [
      ...currentHistory,
      {
        id: timestamp,
        text: `> ${command}`,
        type: "command",
      },
      {
        id: timestamp + 1,
        text: response,
        type: "response",
      },
    ]);

    setCommand("");
  }

  return (
    <main className="terminal-page">
      <h1>Bat Terminal</h1>

      <section className="terminal-window">
        {history.map((line) => (
          <p key={line.id} className={line.type}>
            {line.text}
          </p>
        ))}

        <div className="terminal-input">
          <span>&gt;</span>

          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                executeCommand();
              }
            }}
            autoFocus
          />
        </div>
      </section>
    </main>
  );
}
