import { useEffect, useRef, useState } from "react";

import { moduleCatalog, pageAliases } from "../modules.ts";
import { useNocturne } from "../state/useNocturne.ts";
import type { TerminalLine } from "../types/terminal.ts";
import type { Page } from "../types";
import { playTone } from "../utils/audio.ts";

import "../styles/terminal.css";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function findByName<T extends { name?: string; title?: string }>(items: T[], query: string) {
  const normalizedQuery = normalize(query);

  return items.find((item) => normalize(item.name ?? item.title ?? "").includes(normalizedQuery));
}

type TerminalProps = {
  soundEnabled: boolean;
  onNavigate: (page: Page) => void;
  onOpenVillain: (name: string) => void;
};

const baseCommands = [
  "help", "status city", "list villains", "list missions", "list gadgets",
  "scan gravemere", "signal on",
  ...moduleCatalog.flatMap((module) => module.aliases.map((alias) => `go ${alias}`)),
  "clear", "reset state",
];

export function Terminal({ soundEnabled, onNavigate, onOpenVillain }: TerminalProps) {
  const [command, setCommand] = useState("");
  const typingIntervals = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const {
    operatorName,
    villains,
    missions,
    gadgets,
    captureVillain,
    deployGadget,
    resolveMission,
    resetState,
  } = useNocturne();

  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: 1,
      text: "Aegis Sentinel Console v1.7 initialized.",
      type: "response",
    },
    {
      id: 2,
      text: "Type 'help' to inspect Nocturne Control commands. Use ↑/↓ for history and Tab to complete.",
      type: "response",
    },
  ]);

  useEffect(() => {
    return () => {
      typingIntervals.current.forEach((intervalId) => window.clearInterval(intervalId));
    };
  }, []);

  function typeResponse(id: number, response: string) {
    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;

      setHistory((currentHistory) =>
        currentHistory.map((line) =>
          line.id === id ? { ...line, text: response.slice(0, index) } : line
        )
      );

      if (index >= response.length) {
        window.clearInterval(intervalId);
        typingIntervals.current = typingIntervals.current.filter((item) => item !== intervalId);
      }
    }, 12);

    typingIntervals.current.push(intervalId);
  }

  function getResponse(input: string) {
    const normalizedCommand = normalize(input);

    if (normalizedCommand === "help") {
      return "Commands: status city | villains | missions | gadgets | open <name> | capture/cap <villain> | deploy/dep <gadget> | resolve/res <mission> | scan gravemere | go <page> | whoami | signal on | reset state | clear";
    }

    if (normalizedCommand === "whoami") {
      return `Authenticated operator: ${operatorName || "UNIDENTIFIED"}. Clearance: AEGIS BLACK.`;
    }

    if (normalizedCommand.startsWith("go ")) {
      const page = pageAliases[normalizedCommand.slice(3)];
      if (!page) return `Navigation failed. Available: ${moduleCatalog.map((module) => module.page).join(", ")}.`;
      window.setTimeout(() => onNavigate(page), 180);
      return `Opening ${page.toUpperCase()} module...`;
    }

    if (normalizedCommand === "status city" || normalizedCommand === "status") {
      const escapedVillains = villains.filter((villain) => villain.status === "ESCAPED").length;
      const activeMissions = missions.filter((mission) => mission.status === "ACTIVE").length;

      return `City status: DANGER. ${escapedVillains} escaped targets, ${activeMissions} active missions, ${gadgets.length} Aegis assets indexed.`;
    }

    if (normalizedCommand === "list villains" || normalizedCommand === "villains") {
      return villains.map((villain) => `${villain.name}: ${villain.status} / ${villain.dangerLevel}`).join(" | ");
    }

    if (normalizedCommand === "list missions" || normalizedCommand === "missions") {
      return missions.map((mission) => `${mission.title}: ${mission.status} / risk ${mission.riskLevel}%`).join(" | ");
    }

    if (normalizedCommand === "list gadgets" || normalizedCommand === "gadgets") {
      return gadgets.map((gadget) => `${gadget.name}: ${gadget.status} / power ${gadget.powerLevel}%`).join(" | ");
    }

    if (normalizedCommand === "scan gravemere") {
      const gravemereTargets = villains.filter((villain) => villain.lastLocation.toLowerCase().includes("gravemere"));

      return `Gravemere scan complete: ${gravemereTargets.length} target signal(s). ${gravemereTargets.map((target) => target.name).join(", ") || "No direct lock."}`;
    }

    if (normalizedCommand === "signal on") {
      return "Night Signal protocol online. Rooftop relay visibility degraded by rain, but beam lock is stable.";
    }

    if (normalizedCommand.startsWith("open ")) {
      const query = input.slice(5);
      const villain = findByName(villains, query);
      const mission = findByName(missions, query);
      const gadget = findByName(gadgets, query);

      if (villain) {
        window.setTimeout(() => onOpenVillain(villain.name), 180);
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

    if (normalizedCommand.startsWith("deploy ") || normalizedCommand.startsWith("dep ")) {
      const query = normalizedCommand.startsWith("dep ") ? input.slice(4) : input.slice(7);
      const gadget = findByName(gadgets, query);

      if (!gadget) {
        return "Deployment failed. Aegis asset not found.";
      }

      if (gadget.status === "MAINTENANCE") {
        return `${gadget.name} unavailable. Maintenance lock active: ${gadget.lastMaintenance}.`;
      }

      deployGadget(gadget.id);

      return `${gadget.name} deployment authorized. Power draw registered.`;
    }

    if (normalizedCommand.startsWith("capture ") || normalizedCommand.startsWith("cap ")) {
      const query = normalizedCommand.startsWith("cap ") ? input.slice(4) : input.slice(8);
      const villain = findByName(villains, query);

      if (!villain) {
        return "Capture failed. Gravemere target file not found.";
      }

      if (villain.status === "CAPTURED") {
        return `${villain.name} is already marked as CAPTURED.`;
      }

      captureVillain(villain.id);

      return `${villain.name} capture confirmed. Gravemere containment status updated.`;
    }

    if (normalizedCommand.startsWith("resolve ") || normalizedCommand.startsWith("res ")) {
      const query = normalizedCommand.startsWith("res ") ? input.slice(4) : input.slice(8);
      const mission = findByName(missions, query);

      if (!mission) {
        return "Resolve failed. Mission file not found.";
      }

      if (mission.status === "COMPLETED") {
        return `${mission.title} is already complete.`;
      }

      resolveMission(mission.id);

      return `${mission.title} resolved. Threat model recalculated.`;
    }

    if (normalizedCommand === "reset state") {
      resetState();

      return "Local Nocturne state reset to baseline files.";
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
      playTone("terminal", soundEnabled);
      return;
    }

    const timestamp = Date.now();
    commandHistory.current = [...commandHistory.current.filter((item) => item !== command), command];
    historyIndex.current = commandHistory.current.length;
    const response = getResponse(command);
    const responseId = timestamp + 1;

    playTone(response.toLowerCase().includes("failed") ? "alert" : "terminal", soundEnabled);

    setHistory((currentHistory) => [
      ...currentHistory,
      {
        id: timestamp,
        text: `> ${command}`,
        type: "command",
      },
      {
        id: responseId,
        text: "",
        type: "response",
      },
    ]);

    typeResponse(responseId, response);
    setCommand("");
  }

  return (
    <main className="terminal-page">
      <h1>Sentinel Terminal</h1>

      <section className="terminal-window" role="log" aria-live="off" aria-label="Sentinel terminal output">
        {history.map((line) => (
          <p key={line.id} className={line.type}>
            {line.text}
          </p>
        ))}

        <div className="terminal-input">
          <span>&gt;</span>

          <input
            ref={inputRef}
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                executeCommand();
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                historyIndex.current = Math.max(0, historyIndex.current - 1);
                setCommand(commandHistory.current[historyIndex.current] ?? "");
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                historyIndex.current = Math.min(commandHistory.current.length, historyIndex.current + 1);
                setCommand(commandHistory.current[historyIndex.current] ?? "");
              } else if (event.key === "Tab") {
                event.preventDefault();
                const dynamicCommands = [
                  ...baseCommands,
                  ...villains.flatMap((villain) => [`open ${villain.name}`, `capture ${villain.name}`]),
                  ...missions.map((mission) => `resolve ${mission.title}`),
                  ...gadgets.map((gadget) => `deploy ${gadget.name}`),
                ];
                const match = dynamicCommands.find((item) => item.toLowerCase().startsWith(command.toLowerCase()));
                if (match) setCommand(match);
              }
            }}
            aria-label="Sentinel command"
            autoComplete="off"
            autoFocus
          />
        </div>
      </section>
    </main>
  );
}
